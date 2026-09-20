const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true,
            unique: true // Prevents duplicate conversations for the same job
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        artisan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Stores User ID for simple routing
            required: true
        },
        lastMessage: {
            type: String,
            default: ""
        },
        lastMessageAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);