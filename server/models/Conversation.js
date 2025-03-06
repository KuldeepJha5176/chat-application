const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    chatbot: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    participants: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
   ],
   lastMessage: {
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
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

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;