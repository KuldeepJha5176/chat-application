const User = require("../models/user");
const Conversation = require("../models/conversation");

//get user profile
exports.getUserProfile = async (req, res) => {
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

exports.updateProfile = async (req, res) => {
    try {
      const { username, bio, profilePicture } = req.body;
      const userId = req.user.id;
      
      // Check if username is already taken
      if (username) {
        const existingUser = await User.findOne({ username, _id: { $ne: userId } });
        if (existingUser) {
          return res.status(400).json({ message: 'Username is already taken' });
        }
      }
      
      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          $set: { 
            username: username || undefined,
            bio: bio || undefined,
            profilePicture: profilePicture || undefined,
            updatedAt: new Date()
          } 
        },
        { new: true }
      ).select('-password');
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  //search users by username
  exports.searchUsers = async (req, res) => {
    try {
      const { query } = req.query;
      const userId = req.user.id;
      
      // Find users that match the query and exclude current user
      const users = await User.find({
        _id: { $ne: userId },
        username: { $regex: query, $options: 'i' }
      }).select('_id username profilePicture isOnline lastSeen');
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  // Get user contacts/recent chats
  exports.getContacts = async (req, res) => {
    try {
        const userId = req.user._id;
        //find all conversation involving current user
        const conversations = await Conversation.find({ participants:  { $in: [userId] } }).populate('participants', '_id username profilePicture isOnline lastSeen').populate('chatbot', '_id username profilePicture isOnline lastSeen');
        // extracts contancts from conversations
        const contacts = conversations.map(conversation => {
            //find the other participant(not the current user)
            const otherParticipant = conversation.participants.find(p => p._id.toString() !== userId);
            return {
                user: otherParticipant,
                conversationId: conversation._id,
                lastMessage: conversation.lastMessage,
                updatedAt: conversation.updatedAt,  

            };  
            
        });

    //sort by most recent message
    contacts.sort((a, b) => b.updatedAt - a.updatedAt);
    res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};  