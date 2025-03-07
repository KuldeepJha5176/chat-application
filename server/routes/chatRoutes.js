const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/auth");   

// All routes require authentication
router.use(authMiddleware);

// Conversation routes
router.get('/conversations', chatController.getUserConversations);
router.get('/conversations/:conversationId', chatController.getConversation);
router.post('/conversations', chatController.createConversation);

// Message routes
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/messages', chatController.sendMessage);
router.delete('/messages/:messageId', chatController.deleteMessage);

// Unread messages count
router.get('/unread', chatController.getUnreadCount);

module.exports = router;