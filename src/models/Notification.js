const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true, // Fast queries for user-specific notifications
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null, // Tracks who triggered the event
        },

        type: {
            type: String,
            enum: [
                "JOB_APPLICATION",
                "APPLICATION_ACCEPTED",
                "JOB_STARTED",
                "JOB_COMPLETED",
                "JOB_CONFIRMED", // Added to match lifecycle
                "PAYMENT_RELEASED",
                "REVIEW_SUBMITTED",
            ],
            required: true,
        },

        title: {
            type: String,
            required: true,
        },

        message: {
            type: String,
            required: true,
        },

        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            default: null,
        },

        isRead: {
            type: Boolean,
            default: false,
            index: true, // Optimizes unread notification queries
        },

        readAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for fast queries when filtering user's unread notifications
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);