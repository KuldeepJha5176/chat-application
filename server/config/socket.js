// server/config/socket.js

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const User = require('../models/user'); 
const Conversation = require('../models/conversation');
const Message = require('../models/message');
    

// Initialize WebSocket server
const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ 
    server,
    verifyClient: async (info, callback) => {
      try {
        // Parse the token from query string
        const { query } = url.parse(info.req.url, true);
        
        if (!query.token) {
          return callback(false, 401, 'Unauthorized');
        }
        
        // Verify token
        const decoded = jwt.verify(query.token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return callback(false, 401, 'User not found');
        }
        
        // Attach user to request for later use
        info.req.user = user;
        return callback(true);
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        return callback(false, 401, 'Authentication failed');
      }
    }
  });

  // Track online users - Map userId to WebSocket connection
  const onlineUsers = new Map();
  
  // Track which conversations each client is subscribed to
  const clientSubscriptions = new Map();

  // Broadcast to specific users or conversations
  const broadcast = (data, clients) => {
    if (!clients || !clients.length) return;
    
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Get all clients subscribed to a conversation
  const getConversationClients = (conversationId) => {
    const clients = [];
    clientSubscriptions.forEach((subscriptions, client) => {
      if (subscriptions.includes(conversationId)) {
        clients.push(client);
      }
    });
    return clients;
  };

  wss.on('connection', (ws, req) => {
    const user = req.user;
    console.log(`User connected: ${user._id}`);
    
    // Store user connection
    onlineUsers.set(user._id.toString(), ws);
    
    // Initialize client subscriptions
    clientSubscriptions.set(ws, []);
    
    // Broadcast user online status
    const statusUpdate = {
      type: 'userStatus',
      data: {
        userId: user._id.toString(),
        status: 'online'
      }
    };
    
    broadcast(statusUpdate, Array.from(onlineUsers.values()));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch(data.type) {
          case 'joinConversations':
            // Add user to conversations for receiving messages
            if (Array.isArray(data.conversationIds)) {
              clientSubscriptions.set(ws, data.conversationIds);
            }
            break;
            
          case 'sendMessage':
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
              .populate('sender', 'name avatar')
              .populate('attachments');
            
            // Send to all clients subscribed to this conversation
            const conversationClients = getConversationClients(conversationId);
            
            broadcast({
              type: 'newMessage',
              data: populatedMessage
            }, conversationClients);
            
            // Send notification to conversation participants
            const conversation = await Conversation.findById(conversationId)
              .populate('participants', '_id');
            
            conversation.participants.forEach(participant => {
              const participantId = participant._id.toString();
              
              // Skip the sender
              if (participantId === user._id.toString()) return;
              
              // If user is online, send notification
              const receiverWs = onlineUsers.get(participantId);
              if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
                receiverWs.send(JSON.stringify({
                  type: 'messageNotification',
                  data: {
                    conversationId,
                    message: populatedMessage
                  }
                }));
              }
            });
            break;
            
          case 'typing':
            const typingClients = getConversationClients(data.conversationId);
            
            broadcast({
              type: 'userTyping',
              data: {
                userId: user._id,
                username: user.name,
                isTyping: data.isTyping,
                conversationId: data.conversationId
              }
            }, typingClients);
            break;
            
          case 'markAsRead':
            await Message.updateMany(
              { 
                _id: { $in: data.messageIds },
                sender: { $ne: user._id }
              },
              { 
                $addToSet: { readBy: user._id } 
              }
            );
            
            const readReceiptClients = getConversationClients(data.conversationId);
            
            broadcast({
              type: 'messagesRead',
              data: {
                conversationId: data.conversationId,
                messageIds: data.messageIds,
                readBy: user._id
              }
            }, readReceiptClients);
            break;
            
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error processing message'
        }));
      }
    });

    // Handle client disconnection
    ws.on('close', () => {
      console.log(`User disconnected: ${user._id}`);
      
      // Remove from online users
      onlineUsers.delete(user._id.toString());
      
      // Remove subscriptions
      clientSubscriptions.delete(ws);
      
      // Broadcast offline status
      const statusUpdate = {
        type: 'userStatus',
        data: {
          userId: user._id.toString(),
          status: 'offline'
        }
      };
      
      broadcast(statusUpdate, Array.from(onlineUsers.values()));
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connected',
      userId: user._id.toString()
    }));
  });

  console.log('WebSocket server initialized');
  return wss;
};

module.exports = setupWebSocket;