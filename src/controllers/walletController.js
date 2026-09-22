const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction"); // You MUST track this

exports.fundWallet = async (req, res) => {
    const session = await mongoose.startSession();
    const userId = req.user._id || req.user.id || req.user.userId;

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
            { user: userId },
            {
                $setOnInsert: { user: userId, currency: "NGN" },
                $inc: { balance: fundAmount }
            },
            { new: true, upsert: true, session } // upsert creates it if it doesn't exist
        );

        // 2. Create the immutable ledger record
        await Transaction.create(
            [{
                user:userId,
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

    const userId = req.user._id || req.user.id || req.user.userId;
    try {
        let wallet = await Wallet.findOne({
            user: userId
        });

        if (!wallet) {
            wallet = await Wallet.create({
                user: userId,
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
    const { amount } = req.body;

    // Stop hardcoding req.user.userId!
    const userId = req.user._id || req.user.id || req.user.userId;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!amount || Number(amount) < 1000) {
        return res.status(400).json({ success: false, message: "Minimum withdrawal is 1,000 NGN" });
    }

    const withdrawAmount = Number(amount);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Fast read to check if bank is linked
        const checkWallet = await Wallet.findOne({ user: userId }).session(session);
        if (!checkWallet) throw new Error("Wallet not found");
        if (!checkWallet.bankDetails?.recipientCode) throw new Error("Link a bank account first");

        // 2. THE ATOMIC LOCK & DEDUCT
        // This is mathematically immune to race conditions.
        const wallet = await Wallet.findOneAndUpdate(
            { user: userId, balance: { $gte: withdrawAmount } },
            { $inc: { balance: -withdrawAmount } },
            { session, returnDocument: "after" }
        );

        if (!wallet) {
            throw new Error("Insufficient funds in your Craftad wallet");
        }

        // 3. Create a pending transaction record
        const transaction = await Transaction.create([{
            user: userId,
            amount: withdrawAmount,
            type: "withdrawal",
            reference: `WD-${Date.now()}`,
            status: "pending",
            description: `Withdrawal to account ${checkWallet.bankDetails.accountNumber}`
        }], { session });

        // 4. Hit Paystack's Transfer API (Mocked for Dev)
        let paystackData;

        // If we are just testing, fake a successful Paystack response
        if (process.env.NODE_ENV !== "production") {
            paystackData = {
                status: true,
                data: {
                    transfer_code: `TRF_mock_${Date.now()}`,
                    status: "success",
                    reference: transaction[0].reference
                }
            };
        } else {
            // In production, actually hit Paystack
            const secret = process.env.PAYSTACK_SECRET_KEY;
            const response = await fetch("https://api.paystack.co/transfer", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secret}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    source: "balance",
                    amount: withdrawAmount * 100,
                    recipient: checkWallet.bankDetails.recipientCode,
                    reason: "Craftad Artisan Withdrawal"
                })
            });
            paystackData = await response.json();
        }

        // 5. Check Paystack Response
        if (!paystackData.status) {
            throw new Error(paystackData.message || "Paystack rejected the transfer");
        }

        // 6. Paystack accepted it! Commit DB.
        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Withdrawal queued successfully",
            data: paystackData.data
        });

    } catch (error) {
        // Automatically refunds the atomic deduction if Paystack fails
        if (session.inTransaction()) await session.abortTransaction();

        console.error("🚨 Withdrawal Error:", error.message);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        await session.endSession();
    }
};