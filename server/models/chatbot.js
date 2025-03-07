const mongoose = require("mongoose");

const chatbotSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
        default: "https://ui-avatars.com/api/?name=Chatbot&background=random",
    },
    isOnline: {
        type: Boolean,
        default: true,
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});
const Chatbot = mongoose.model("Chatbot", chatbotSchema);   
module.exports = Chatbot;   