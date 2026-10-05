const crypto = require("crypto");
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

exports.paystackWebhook = async (req, res) => {
    // 1. Acknowledge receipt immediately so Paystack doesn't retry
    res.status(200).send("OK");

    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) throw new Error("PAYSTACK_SECRET_KEY is missing");

        // 2. Hash the RAW BUFFER
        const hash = crypto
            .createHmac("sha512", secret)
            .update(req.body)
            .digest("hex");

        if (hash !== req.headers["x-paystack-signature"]) {
            console.error("🚨 Hack attempt: Invalid Paystack signature");
            return;
        }

        // 3. Parse the buffer into JSON
        const event = JSON.parse(req.body.toString());

        // ==========================================
        // SCENARIO 1: WALLET DEPOSIT SUCCESS
        // ==========================================
        if (event.event === "charge.success") {
            const { reference, amount, metadata } = event.data;
            const fundAmount = amount / 100; // Convert Kobo to Naira
            const userId = metadata?.userId;

            if (!userId) {
                console.error("Webhook Error: No userId found in Paystack metadata");
                return;
            }
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Idempotency Check
                const existingTx = await Transaction.findOne({ reference }).session(session);
                if (existingTx) {
                    await session.abortTransaction();
                    return;
                }

                await Wallet.findOneAndUpdate(
                    { user: userId },
                    {
                        $setOnInsert: { user: userId, currency: "NGN" },
                        $inc: { balance: fundAmount }
                    },
                    { returnDocument: "after", upsert: true, session }
                );

                await Transaction.create(
                    [{
                        user: userId,
                        type: "wallet_fund",
                        amount: fundAmount,
                        reference: reference,
                        status: "successful",
                        description: "Paystack Wallet Top-up"
                    }],
                    { session }
                );

                await session.commitTransaction();
                console.log(`✅ Successfully funded wallet for user ${userId} with ${fundAmount} NGN`);

            } catch (dbError) {
                if (session.inTransaction()) await session.abortTransaction();
                console.error("Database Error during deposit Webhook:", dbError.message);
            } finally {
                await session.endSession();
            }
        }

            // ==========================================
            // SCENARIO 2: WITHDRAWAL TRANSFER SUCCESS
        // ==========================================
        else if (event.event === "transfer.success") {
            const { reference } = event.data;

            await Transaction.findOneAndUpdate(
                { reference: reference },
                { $set: { status: "successful" } }
            );
            console.log(`✅ Transfer ${reference} confirmed successful by NIBSS.`);
        }

            // ==========================================
            // SCENARIO 3: WITHDRAWAL TRANSFER FAILED (SAFETY NET REFUND)
        // ==========================================
        else if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
            const { reference } = event.data;

            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // 1. Find the pending transaction
                const tx = await Transaction.findOne({ reference }).session(session);

                if (!tx) {
                    console.error(`🚨 Webhook Error: Transaction ${reference} not found.`);
                    await session.abortTransaction();
                    return;
                }

                // 2. Idempotency Check: Prevent double refunds
                if (tx.status === "failed" || tx.status === "reversed") {
                    console.log(`⚠️ Transfer ${reference} already marked failed. Skipping refund to prevent duplicate.`);
                    await session.abortTransaction();
                    return;
                }

                // 3. Mark transaction as failed
                tx.status = "failed";
                await tx.save({ session });

                // 4. Refund the wallet atomically
                await Wallet.findOneAndUpdate(
                    { user: tx.user },
                    { $inc: { balance: tx.amount } }, // Refund the exact NGN amount deducted initially
                    { session }
                );

                await session.commitTransaction();
                console.log(`❌ Transfer ${reference} failed. Refunded ${tx.amount} NGN back to wallet.`);
            } catch (dbError) {
                if (session.inTransaction()) await session.abortTransaction();
                console.error("Database Error during withdrawal refund:", dbError.message);
            } finally {
                await session.endSession();
            }
        }

    } catch (error) {
        console.error("Webhook processing error:", error.message);
    }
};