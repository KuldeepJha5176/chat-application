const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const zod = require("zod");

const signupBody = zod.object({
  username: zod.string().min(3).max(20).optional(),
  email: zod.string().email().optional(),
  password: zod.string().min(6).max(20).optional(),
});
 const signup = async (req, res) => {
  try {
    const { success } = signupBody.safeParse(req.body);
    if (!success) {
      return res.status(411).json({
        message: "Invalid request body",
      });
    }
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }
    const existingEmail = await User.findOne({ email: req.body.email });
    if (existingEmail) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      profilePicture: `https://ui-avatars.com/api/?name=${username}&background=random`,
      isOnline: true,
      lastSeen: new Date(),
    });
    res.status(201).json({
      message: "User created successfully",
      user: user,
    });
    const savedUser = await newUser.save();

    // Generate token
    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        profilePicture: savedUser.profilePicture,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const signinBody = zod.object({
  username: zod.string().min(3).max(20).optional(),
  password: zod.string().min(6).max(20).optional(),
});
const signin = async (req, res) => {
  try {
    const { success } = signinBody.safeParse(req.body);
    if (!success) {
      return res.status(411).json({
        message: "Invalid request body",
      });
    }
    const user = await User.findOne({ username: req.body.username });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    const isPasswordCorrect = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Incorrect password",
      });
    }
    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    user.isOnline = false;
    user.lastSeen = new Date();
    await user.save();
    res.status(200).json({
      message: "User logged out successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// Get current authenticated user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {signup, signin, logout, getCurrentUser};
