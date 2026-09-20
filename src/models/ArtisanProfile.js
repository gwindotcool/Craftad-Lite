const mongoose = require("mongoose");

const artisanProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        skills: {
            type: [String],
            required: true,
            validate: {
                validator: (skills) => skills.length > 0,
                message: "At least one skill is required"
            }
        },

        yearsOfExperience: {
            type: Number,
            required: true,
            min: 0
        },

        bio: {
            type: String,
            trim: true
        },

        serviceAreas: {
            type: [String],
            default: []
        },

        serviceRadiusKm: {
            type: Number,
            default: 10,
            min: 1
        },

        location: {
            type: {
                type: String,
                enum: ["Point"],
                required: true
            },

            coordinates: {
                type: [Number],
                required: true,
                validate: {
                    validator: (coordinates) =>
                        coordinates.length === 2,
                    message:
                        "Location must contain [longitude, latitude]"
                }
            }
        },

        ratingAverage: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        totalJobsCompleted: {
            type: Number,
            default: 0,
            min: 0
        },

        totalReviews: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

artisanProfileSchema.index({
    location: "2dsphere"
});

module.exports = mongoose.model(
    "ArtisanProfile",
    artisanProfileSchema
);