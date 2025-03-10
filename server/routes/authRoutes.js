const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

// Public routes
router.post("/signup", authController.signup);
router.post("/signin", authController.signin);

// Protected routes - use middleware correctly
router.get("/me", authMiddleware, authController.getCurrentUser);
router.post("/logout", authMiddleware, authController.logout);  

module.exports = router;