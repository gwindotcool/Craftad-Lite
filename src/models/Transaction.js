const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        type: {
            type: String,
            enum: [
                "deposit",
                "escrow_fund",
                "escrow_release",
                "platform_fee",
                "withdrawal"
            ],
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        reference: {
            type: String,
            required: true,
            unique: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "successful",
                "failed"
            ],
            default: "pending"
        },

        description: {
            type: String,
            trim: true
        },

        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Transaction", transactionSchema);