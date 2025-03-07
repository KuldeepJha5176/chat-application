const User = require("../models/user");
const Conversation = require("../models/conversation");
const Chatbot = require("../models/chatbot");

//get user conversations
const getUserConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const conversations = await Conversation.find({ participants:  { $in: [userId] } }).populate('participants', '_id username profilePicture isOnline lastSeen').populate('chatbot', '_id username profilePicture isOnline lastSeen').sort({ updatedAt: -1 });
        

        //format to include the other participant details
        const formattedConversations = conversations.map(conversation => {
            //find the other participant(not the current user)
            const otherParticipant = conversation.participants.find(p => p._id.toString() !== userId);
            return {
                user: otherParticipant,
                chatbot: conversation.chatbot,
                lastMessage: conversation.lastMessage,
                updatedAt: conversation.updatedAt,  
            };  
        });

        res.json(formattedConversations);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
// Get single conversation

const getConversation = async (req, res) => {
    try {  
        const conversationId = req.params.conversationId;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId).populate('participants', '_id username profilePicture isOnline lastSeen').populate('chatbot', '_id username profilePicture isOnline lastSeen');
        
        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found",
            });
        }

        if (!conversation.participants.some(p => p._id.toString() === userId)) {
            return res.status(403).json({
                message: "You are not a participant in this conversation",
            });
        }
         // Format to include other participant details
         const formattedConversation = {
            id: conversation._id,
            otherUser: otherParticipant,
            chatbot: conversation.chatbot,
            lastMessage: conversation.lastMessage,
            updatedAt: conversation.updatedAt,
            createdAt: conversation.createdAt, 

        };
        res.json(formattedConversation);
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error: error.message }); 
    }
};

// Create a new conversation
const createConversation = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const { senderId } = req.user.id;
         // Validate receiverId
         if (!receiverId) {
            return res.status(400).json({
                message: "Invalid request body",
            });
        }
        // Check if users exist
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({
                message: "Receiver not found",
            });
        }
        // Check if conversation already exists
        const existingConversation = await Conversation.findOne({ participants: { $all: [senderId, receiverId] } }).populate('participants', '_id username profilePicture isOnline lastSeen').populate('chatbot', '_id username profilePicture isOnline lastSeen'); 
        if (existingConversation) {
           //format response
           const otherParticipant = existingConversation.participants.find(
            p => p._id.toString() !== senderId
          );

          const formattedConversation = {
            id: existingConversation._id,
            otherUser: otherParticipant,
            chatbot: existingConversation.chatbot,
            lastMessage: existingConversation.lastMessage,
            updatedAt: existingConversation.updatedAt,
            createdAt: existingConversation.createdAt, 

        };
        res.json(formattedConversation);
        return;
        }
        
         // Create new conversation
         const newConversation = new Conversation({
            participants: [senderId, receiverId],
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          const savedConversation = await newConversation.save();

          // Format response and populate other participant details
          const populatedConversation = await Conversation.findById(savedConversation._id)
          .populate('participants', '_id username profilePicture isOnline lastSeen');
        
        const otherParticipant = populatedConversation.participants.find(
          p => p._id.toString() !== senderId
        );
        const formattedConversation = {
            _id: populatedConversation._id,
            otherUser: otherParticipant,
            lastMessage: populatedConversation.lastMessage,
            updatedAt: populatedConversation.updatedAt,
            createdAt: populatedConversation.createdAt
          };
          
          res.status(201).json(formattedConversation);
        } catch (error) {
          res.status(500).json({ message: 'Server error', error: error.message });
        }
      };

      // Get messages in a conversation
const getMessages = async (req, res) => {
            try {
                const conversationId = req.params.conversationId;
                const userId = req.user._id;
                const { page = 1, limit = 50 } = req.query;

                //verify conversation exists and user is a participant
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) {
                    return res.status(404).json({
                        message: "Conversation not found",
                    }); 

                    }
                    if (!conversation.participants.includes(userId)) {  
                        return res.status(403).json({
                            message: "Not authorized to view these messages",   
                        });
                    }

       // Get messages with pagination
       
       const skip = (parseInt(page) - 1) * parseInt(limit);

       const messages = await conversation.find({conversationId: conversationId})
       .sort({createdAt: -1}).
       skip(skip)
       .limit(parseInt(limit))
       .populate('sender', '_id username profilePicture');
    
       // Return in chronological order (oldest first)
       const orderedMessages = messages.reverse();

       // Mark unread messages as read
       await Message.updateMany(
        { 
          conversationId, 
          sender: { $ne: userId }, 
          read: false 
        },
        { 
          $set: { 
            read: true, 
            readAt: new Date() 
          } 
        }
      );

       // Update conversation last message read status if needed
       if (conversation.lastMessage && 
        conversation.lastMessage.sender.toString() !== userId && 
        !conversation.lastMessage.read) {
      
      conversation.lastMessage.read = true;
      await conversation.save();
    }
    
    // Count total messages for pagination info
    const totalMessages = await Message.countDocuments({ conversationId });
    
    res.json({
      messages: orderedMessages,
      pagination: {
        total: totalMessages,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalMessages / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send a message
const sendMessage = async (req, res) => {
    try {
        const { conversationId, content, mediaUrl } = req.body;
        const senderId = req.user.id;

        //validate  inputs
        if (!conversationId || (!content && !mediaUrl)) {
            return res.status(400).json({ message: 'Conversation ID and content/media are required' });
          }

           // Verify conversation exists and user is part of it
           const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({
                    message: "Conversation not found",
                });
            }
            if (!conversation.participants.includes(senderId)) {
                return res.status(403).json({
                    message: "Not authorized to send messages in this conversation",
                });
            }
            // Create new message
            const newMessage = new Message({
                conversationId,
                sender: senderId,
                content: content || '',
                mediaUrl: mediaUrl || '',
                read: false,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const savedMessage = await newMessage.save();

            //populate sender details
            const populatedMessage = await Message.findById(savedMessage._id)
            .populate('sender', '_id username profilePicture');

            //update conversation last message
            conversation.lastMessage = {
                sender : senderId,
                content: content || '[Message]',
                mediaUrl: mediaUrl || '',
                createdAt: new Date(),
                
                read: false,
                timestamp: new Date()
            };
            conversation.updatedAt  = new Date();
            await conversation.save();
            
            res.status(201).json(populatedMessage);
        }   catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    };

    // Delete a message (mark as deleted)
const deleteMessage = async (req, res) => {
        try {
            const { messageId } = req.params;
            const userId = req.user.id;

            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({
                    message: "Message not found",
                });
            }
        // Only message sender can delete
        if (message.sender.toString() !== userId) {
            return res.status(403).json({   
                message: "Not authorized to delete this message"   
            });
        }
        // Mark as deleted rather than removing completely
        message.deleted = true;
        message.content = '[Message deleted]';
        message.mediaUrl = '';
        await message.save();

        res.status(200).json({ message: "Message deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    };

  // Get unread message count
const getUnreadCount = async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Find conversations with unread messages
      const conversations = await Conversation.find({
        participants: userId,
        'lastMessage.sender': { $ne: userId },
        'lastMessage.read': false
      });
    
       // Count total unread messages
    const unreadCount = await Message.countDocuments({
        conversationId: { $in: conversations.map(c => c._id) },
        sender: { $ne: userId },
        read: false
      });
      
      res.json({
        unreadCount,
        conversations: conversations.length
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  module .exports = {getUserConversations, getConversation, createConversation, getMessages, sendMessage, deleteMessage, getUnreadCount};




            