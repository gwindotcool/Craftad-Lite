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

exports.verifyBankAccount = async (req, res) => {
    const { accountNumber, bankCode } = req.body;

    // 1. Stress test the input
    if (!accountNumber || !bankCode) {
        return res.status(400).json({
            success: false,
            message: "accountNumber and bankCode are required"
        });
    }

    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) throw new Error("PAYSTACK_SECRET_KEY is missing from environment variables");

        // 2. Ping Paystack's resolution endpoint
        const response = await fetch(
            `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${secret}`
                }
            }
        );

        const data = await response.json();

        // 3. Handle Paystack rejection (invalid account or bank code)
        if (!data.status) {
            return res.status(400).json({
                success: false,
                message: data.message || "Could not resolve bank account"
            });
        }

        // 4. Return the verified data to the frontend
        return res.status(200).json({
            success: true,
            message: "Bank account verified successfully",
            data: {
                accountName: data.data.account_name,
                accountNumber: data.data.account_number,
                bankId: data.data.bank_id
            }
        });

    } catch (error) {
        console.error("🚨 Bank Resolution Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during bank verification"
        });
    }
};

exports.addWithdrawalBank = async (req, res) => {
    // In production, the frontend passes these after step 1 succeeds
    const { accountName, accountNumber, bankCode } = req.body;
    console.log("🚨 JWT PAYLOAD IN ADD-BANK:", req.user);
    const userId = req.user._id || req.user.id || req.user.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: "JWT ID missing" });
    }


    if (!accountName || !accountNumber || !bankCode) {
        return res.status(400).json({
            success: false,
            message: "accountName, accountNumber, and bankCode are required"
        });
    }

    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;

        // 1. Register the account with Paystack
        const response = await fetch("https://api.paystack.co/transferrecipient", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "nuban",
                name: accountName,
                account_number: accountNumber,
                bank_code: bankCode,
                currency: "NGN"
            })
        });

        const data = await response.json();

        if (!data.status) {
            return res.status(400).json({
                success: false,
                message: data.message || "Failed to create transfer recipient"
            });
        }

        const recipientCode = data.data.recipient_code;

        // 2. Save the recipient code permanently in the artisan's wallet
        await Wallet.findOneAndUpdate(
            { user: userId },
            {
                $set: {
                    bankDetails: {
                        accountName,
                        accountNumber,
                        bankCode,
                        recipientCode
                    }
                }
            },
            { returnDocument: "after", upsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "Bank account linked successfully",
            data: { recipientCode }
        });

    } catch (error) {
        console.error("🚨 Recipient Creation Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during recipient creation"
        });
    }
};

exports.requestWithdrawal = async (req, res) => {
    const { amount } = req.body; // Amount in NGN
    console.log("🚨 JWT PAYLOAD IN WITHDRAW:", req.user);
    const userId = req.user._id || req.user.id || req.user.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: "JWT ID missing" });
    }

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Enter a valid withdrawal amount" });
    }

    // Start atomic transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Find wallet and verify balance
        const wallet = await Wallet.findOne({ user: userId }).session(session);

        if (!wallet) throw new Error("Wallet not found");
        if (!wallet.bankDetails?.recipientCode) throw new Error("Link a bank account first");
        if (wallet.balance < amount) throw new Error("Insufficient funds in your Craftad wallet");

        // 2. Deduct funds IMMEDIATELY to prevent double-click double-spend
        wallet.balance -= amount;
        await wallet.save({ session });

        // 3. Create a pending transaction record
        const transaction = await Transaction.create([{
            user: userId,
            amount: amount,
            type: "withdrawal",
            reference: `WD-${Date.now()}`,
            status: "pending",
            description: "Withdrawal to bank account"
        }], { session });

        // 4. Hit Paystack's Transfer API
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const response = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                source: "balance", // Always "balance" for Paystack transfers
                amount: amount * 100, // Convert NGN to Kobo!
                recipient: wallet.bankDetails.recipientCode,
                reason: "Craftad Artisan Withdrawal"
            })
        });

        const paystackData = await response.json();

        // 5. If Paystack rejects it, abort everything.
        // MongoDB will automatically restore the user's deducted balance.
        if (!paystackData.status) {
            throw new Error(paystackData.message || "Paystack rejected the transfer");
        }

        // 6. Paystack accepted it! Commit the database changes.
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Withdrawal queued successfully",
            data: paystackData.data
        });

    } catch (error) {
        // Discard all database changes - user gets their money back
        await session.abortTransaction();
        session.endSession();

        console.error("🚨 Withdrawal Error:", error.message);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};