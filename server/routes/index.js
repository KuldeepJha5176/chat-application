
const express = require("express");
const userRouter = require("./userRoutes");
const chatRouter = require("./chatRoutes");     
const authRouter = require("./authRoutes");
const router = express.Router();

router.use("/user", userRouter);
router.use("/chat", chatRouter);
router.use("/auth", authRouter);

module.exports = router; 