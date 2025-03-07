const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

// All routes require authentication
router.use(authMiddleware);


router.get('/profile/:userId', userController.getUserProfile);
router.put('/profile', userController.updateProfile);
router.get('/search', userController.searchUsers);
router.get('/contacts', userController.getContacts);


module.exports = router;