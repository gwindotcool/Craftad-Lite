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
                "wallet_fund",         // Adding money via Paystack
                "withdrawal",          // Pushing money out via Paystack
                "job_payment_escrow",  // Locking client funds
                "job_payment_release", // Paying the artisan upon completion
                "escrow_refund"        // Refunding the client if the job is canceled
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