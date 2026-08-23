const mongoose = require("mongoose");

const artisanProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },
        category: {
            type: String,
            enum: [
                "electrician",
                "plumber",
                "carpenter",
                "mechanic",
                "welder",
                "painter",
                "cleaner"
            ],
            required: true
        },
        bio: {
            type: String,
            trim: true
        },
        yearsOfExperience: {
            type: Number,
            required: true,
            min: 0
        },
        hourlyRate: {
            type: Number,
            required: true,
            min: 0
        },
        serviceLocation: {
            type: String,
            required: true,
            trim: true
        },
        availability: {
            type: Boolean,
            default: true
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        totalReviews: {
            type: Number,
            default: 0,
            min: 0
        },

        completedJobs: {
            type: Number,
            default: 0,
            min: 0
        },
    },
    {
        timestamps: true
    }
)
module.exports = mongoose.model(
    "ArtisanProfile",
    artisanProfileSchema
);