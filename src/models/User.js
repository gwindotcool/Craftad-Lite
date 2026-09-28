const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        },

        role: {
            type: String,
            enum: ["customer", "artisan"],
            default: "customer"
        },
        fcmTokens: [
            {
                type: String,
                trim: true,
            },
        ],
        isActive: {
            type: Boolean,
            default: true
        },
        isVerified: {
            type: Boolean,
            default: function() {
                return this.role !== 'artisan'; // Customers are auto-verified, artisans start unverified
            }
        }
    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);