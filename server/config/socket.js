// server/config/socket.js

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Conversation = require('../models/conversation');
const Message = require('../models/message');

const setupWebSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
      credentials: true
    }
  });

  // Track online users - Map userId to socket id and user data
  const onlineUsers = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Get online users list
  const getOnlineUsersList = async () => {
    const usersList = [];
    for (const [userId, socketId] of onlineUsers.entries()) {
      const user = await User.findById(userId).select('username avatar');
      if (user) {
        usersList.push({
          id: userId,
          username: user.username,
          avatar: user.avatar
        });
      }
    }
    return usersList;
  };

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`User connected: ${user._id}`);

    // Store user connection
    onlineUsers.set(user._id.toString(), socket.id);

    // Broadcast user online status
    io.emit('userStatus', {
      userId: user._id.toString(),
      status: 'online'
    });

    // Handle get online users request
    socket.on('getOnlineUsers', async () => {
      const usersList = await getOnlineUsersList();
      socket.emit('onlineUsers', usersList);
    });

    // Join conversations
    socket.on('joinConversations', (conversationIds) => {
      if (Array.isArray(conversationIds)) {
        conversationIds.forEach(id => socket.join(id));
      }
    });

    // Handle new message
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, content, attachments } = data;

        // Create and save new message
        const newMessage = new Message({
          conversation: conversationId,
          sender: user._id,
          content,
          attachments: attachments || []
        });

        await newMessage.save();

        // Update conversation with last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: newMessage._id,
          $inc: { messageCount: 1 }
        });

        // Populate sender info before sending to clients
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'username avatar')
          .populate('attachments');

        // Send to all clients in the conversation
        io.to(conversationId).emit('newMessage', populatedMessage);

        // Send notification to conversation participants
        const conversation = await Conversation.findById(conversationId)
          .populate('participants', '_id');

        conversation.participants.forEach(participant => {
          const participantId = participant._id.toString();
          if (participantId === user._id.toString()) return;

          const receiverSocketId = onlineUsers.get(participantId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('messageNotification', {
              conversationId,
              message: populatedMessage
            });
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Handle typing status
    socket.on('typing', (data) => {
      socket.to(data.conversationId).emit('userTyping', {
        userId: user._id,
        username: user.username,
        isTyping: data.isTyping,
        conversationId: data.conversationId
      });
    });

    // Handle mark as read
    socket.on('markAsRead', async (data) => {
      try {
        await Message.updateMany(
          {
            _id: { $in: data.messageIds },
            sender: { $ne: user._id }
          },
          {
            $addToSet: { readBy: user._id }
          }
        );

        io.to(data.conversationId).emit('messagesRead', {
          conversationId: data.conversationId,
          messageIds: data.messageIds,
          readBy: user._id
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Error marking messages as read' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user._id}`);
      onlineUsers.delete(user._id.toString());

      // Broadcast offline status
      io.emit('userStatus', {
        userId: user._id.toString(),
        status: 'offline'
      });
    });

    // Send initial connection confirmation
    socket.emit('connected', {
      userId: user._id.toString()
    });

    // Send initial online users list
    const usersList = await getOnlineUsersList();
    socket.emit('onlineUsers', usersList);
  });

  console.log('Socket.IO server initialized');
  return io;
};

module.exports = setupWebSocket;