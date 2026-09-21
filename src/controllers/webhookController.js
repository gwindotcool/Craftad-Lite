const crypto = require("crypto");
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

exports.paystackWebhook = async (req, res) => {
    // 1. Acknowledge receipt immediately
    res.status(200).send("OK");

    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) throw new Error("PAYSTACK_SECRET_KEY is missing");

        // 2. Hash the RAW BUFFER, do not stringify it!
        const hash = crypto
            .createHmac("sha512", secret)
            .update(req.body)
            .digest("hex");

        if (hash !== req.headers["x-paystack-signature"]) {
            console.error("🚨 Hack attempt: Invalid Paystack signature");
            return;
        }

        // 3. Now parse the buffer into JSON to read it
        const event = JSON.parse(req.body.toString());

        if (event.event === "charge.success") {
            const { reference, amount, metadata } = event.data;
            const fundAmount = amount / 100;

            // 4. Extract userId from metadata, NOT from req.user
            const userId = metadata?.userId;

            if (!userId) {
                console.error("Webhook Error: No userId found in Paystack metadata");
                return;
            }
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // 4. IDEMPOTENCY CHECK: Did we already process this reference?
                const existingTx = await Transaction.findOne({ reference }).session(session);
                if (existingTx) {
                    console.log(`Transaction ${reference} already processed. Skipping.`);
                    await session.abortTransaction();
                    return;
                }

                // 5. Fund the wallet atomically
                await Wallet.findOneAndUpdate(
                    { user: userId },
                    {
                        $setOnInsert: { user: userId, currency: "NGN" },
                        $inc: { balance: fundAmount }
                    },
                    { returnDocument: "after", upsert: true, session }
                );

                // 6. Write the immutable ledger record
                await Transaction.create(
                    [{
                        user: userId,
                        type: "wallet_fund",
                        amount: fundAmount,
                        reference: reference, // Save the actual Paystack reference
                        status: "successful",
                        description: "Paystack Wallet Top-up"
                    }],
                    { session }
                );

                await session.commitTransaction();
                console.log(`✅ Successfully funded wallet for user ${userId} with ${fundAmount} NGN`);

            } catch (dbError) {
                if (session.inTransaction()) await session.abortTransaction();
                console.error("Database Error during Webhook:", dbError.message);
            } finally {
                await session.endSession();
            }
        }
    } catch (error) {
        console.error("Webhook processing error:", error.message);
    }
};
