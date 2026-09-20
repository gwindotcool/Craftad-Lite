const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction"); // You MUST track this

exports.fundWallet = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount } = req.body;
        const fundAmount = Number(amount);

        if (!fundAmount || fundAmount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0"
            });
        }

        // 1. Find and update the wallet atomically to prevent race conditions
        let wallet = await Wallet.findOneAndUpdate(
            { user: req.user.userId },
            {
                $setOnInsert: { user: req.user.userId, currency: "NGN" },
                $inc: { balance: fundAmount }
            },
            { new: true, upsert: true, session } // upsert creates it if it doesn't exist
        );

        // 2. Create the immutable ledger record
        await Transaction.create(
            [{
                user: req.user.userId,
                type: "wallet_fund",
                amount: fundAmount,
                reference: `FUND-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                status: "successful",
                description: "Wallet top-up",
                // No job ID here because this is just a general funding event
            }],
            { session }
        );

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Wallet funded successfully",
            wallet
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        return res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        await session.endSession();
    }
};
exports.getMyWallet = async (req, res) => {
    try {
        let wallet = await Wallet.findOne({
            user: req.user.userId
        });

        if (!wallet) {
            wallet = await Wallet.create({
                user: req.user.userId,
                balance: 0
            });
        }

        return res.status(200).json({
            success: true,
            wallet
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};