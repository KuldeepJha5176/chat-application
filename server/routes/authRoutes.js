const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
//public routes
router.post("/signup", authMiddleware, authController.signup);
router.post("/signin", authMiddleware, authController.signin);

//protected routes
router.get("/me", authMiddleware, authController.getCurrentUser);
router.post("/logout", authMiddleware, authController.logout);  


exports.authRouter = router;