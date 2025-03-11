const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    chatbot: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
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
            required: false,
        },
        message: {
            type: String,
            required: false,
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