const mongoose = require("mongoose");

const platformWalletSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            default: "main",
            unique: true,
            immutable: true
        },

        balance: {
            type: Number,
            default: 0,
            min: 0
        },

        escrowBalance: {
            type: Number,
            default: 0,
            min: 0
        },

        totalFees: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);
module.exports = mongoose.model(
    "PlatformWallet",
    platformWalletSchema
);