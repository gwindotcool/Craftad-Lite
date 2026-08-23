const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        artisan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true,
            unique: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        platformFee: {
            type: Number,
            required: true,
            min: 0
        },

        artisanAmount: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: [
                "pending",
                "escrow_funded",
                "released",
                "failed"
            ],
            default: "pending"
        },

        reference: {
            type: String,
            required: true,
            unique: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Payment", paymentSchema);