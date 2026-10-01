const mongoose = require("mongoose");

const escrowSchema = new mongoose.Schema(
    {
        client: {
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
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        platformFee: {
            type: Number,
            required: true,
            default: 0
        },
        reference: {
            type: String,
            required: true,
            unique: true
        },
        // Payment gateway status
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending"
        },
        // Escrow lifecycle status
        escrowStatus: {
            type: String,
            enum: [
                "HELD",          // Money is locked in vault, artisan can start
                "RELEASED",      // Job done, money sent to artisan
                "DISPUTED",      // Client raised an issue, funds frozen
                "REFUNDED",      // Admin ruled in favor of client, money returned
                "FORCED_RELEASED" // Admin ruled in favor of artisan during dispute
            ],
            default: "HELD"
        },
        disputeReason: {
            type: String,
            trim: true,
            default: null
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Escrow", escrowSchema);