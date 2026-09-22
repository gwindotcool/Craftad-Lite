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
                "wallet_fund",
                "withdrawal",
                "job_payment_escrow",
                "job_payment_release", // <-- YOU NEED THIS
                "platform_fee",        // <-- AND YOU NEED THIS
                "escrow_refund"
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