const { Schema, model } = require("mongoose");


const messageSchema = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    mediaUrl: {
        type: String,
        default: "",
    },  
    createdAt: {    
        type: Date,
        default: Date.now,
    },  
    deletedAt: {
        type: Date,
        default: Date.now,
    },
    readAt: {
        type: Date,
        default: Date.now,
    },
})

module.exports = model("message", messageSchema)    
