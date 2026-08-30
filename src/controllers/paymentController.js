const mongoose = require("mongoose");

const Job = require("../models/job");
const Wallet = require("../models/Wallet");
const Payment = require("../models/Payment");
const Transaction = require("../models/Transaction");
const PlatformWallet = require("../models/PlatformWallet");
const ArtisanProfile = require("../models/ArtisanProfile");

exports.fundJobEscrow = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const {jobId} = req.params;

        const {
            userId
        } = req.user;

        session.startTransaction();

        // 1. Find the job
        const job = await Job.findById(jobId).session(session);

        if (!job) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // 2. Make sure the logged-in user owns the job
        if (job.customer.toString() !== userId) {
            await session.abortTransaction();

            return res.status(403).json({
                success: false,
                message: "You are not allowed to fund this job"
            });
        }

        // 3. Job must be assigned
        if (job.status !== "assigned") {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message: "Job must be assigned before payment"
            });
        }
        if (!job.assignedArtisan) {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message: "No artisan has been assigned to this job"
            });
        }
        const artisanProfile = await ArtisanProfile.findById(
            job.assignedArtisan
        ).session(session);

        if (!artisanProfile) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Artisan profile not found"
            });
        }

        // 4. Find customer's wallet
        const wallet = await Wallet.findOne({
            user: userId
        }).session(session);

        if (!wallet) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            });
        }

        // 5. Check customer's balance
        if (wallet.balance < job.budget) {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance"
            });
        }

        // 6. Make sure payment doesn't already exist
        const existingPayment = await Payment.findOne({
            job: jobId
        }).session(session);

        if (existingPayment) {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message: "Payment already exists for this job"
            });
        }

        // 7. Calculate platform fee
        const platformFee = job.budget * 0.10;

        const artisanAmount = job.budget - platformFee;

        // 8. Create payment
        const reference = `CRFT-${Date.now()}`;

        const payment = await Payment.create(
            [{
                customer: job.customer,
                artisan: artisanProfile.user,
                job: job._id,
                amount: job.budget,
                platformFee,
                artisanAmount,
                status: "escrow_funded",
                reference
            }],
            {session}
        );

        // 9. Deduct money from customer wallet
        wallet.balance -= job.budget;

        await wallet.save({session});

        // 10. Find/create platform wallet
        let platformWallet = await PlatformWallet.findOne({
            key: "main"
        }).session(session);

        if (!platformWallet) {
            const createdWallet = await PlatformWallet.create(
                [{
                    balance: 0,
                    escrowBalance: 0,
                    totalFees: 0
                }],
                {session}
            );

            platformWallet = createdWallet[0];
        }

        // 11. Move money into escrow
        platformWallet.escrowBalance += job.budget;

        await platformWallet.save({session});

        // 12. Record transaction
        await Transaction.create(
            [{
                user: userId,
                type: "escrow_fund",
                amount: job.budget,
                reference: `TX-${Date.now()}`,
                status: "successful",
                description: `Escrow funding for job ${job._id}`,
                job: job._id
            }],
            {session}
        );

        // 13. Everything succeeded
        await session.commitTransaction();

        return res.status(201).json({
            success: true,
            message: "Job funded successfully",
            payment: payment[0]
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
}

exports.releaseEscrow = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { jobId } = req.params;
        const { userId } = req.user;

        session.startTransaction();

        // 1. Find the payment
        const payment = await Payment.findOne({
            job: jobId
        }).session(session);

        if (!payment) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        // 2. Find the job
        const job = await Job.findById(jobId).session(session);

        if (!job) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // 3. Make sure the logged-in customer owns the job
        if (job.customer.toString() !== userId) {
            await session.abortTransaction();

            return res.status(403).json({
                success: false,
                message: "You are not allowed to release this payment"
            });
        }

        // 4. Job must be customer confirmed
        if (job.status !== "customer_confirmed") {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message: "Job must be confirmed before payment release"
            });
        }

        // 5. Payment must still be in escrow
        if (payment.status !== "escrow_funded") {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message: "Payment has already been released or is not available"
            });
        }

        // 6. Make sure the job has an assigned artisan
        if (!job.assignedArtisan) {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message: "No artisan has been assigned to this job"
            });
        }

        // 7. Find artisan profile
        const artisanProfile = await ArtisanProfile.findById(
            job.assignedArtisan
        ).session(session);

        if (!artisanProfile) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Artisan profile not found"
            });
        }

        // 8. Find or create artisan wallet
        let artisanWallet = await Wallet.findOne({
            user: artisanProfile.user
        }).session(session);

        if (!artisanWallet) {
            const createdWallet = await Wallet.create(
                [{
                    user: artisanProfile.user,
                    balance: 0,
                    currency: "NGN"
                }],
                { session }
            );

            artisanWallet = createdWallet[0];
        }

        // 9. Find platform wallet
        const platformWallet = await PlatformWallet.findOne()
            .session(session);

        if (!platformWallet) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Platform wallet not found"
            });
        }

        // 10. Make sure escrow has enough money
        if (platformWallet.escrowBalance < payment.amount) {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message: "Insufficient escrow balance"
            });
        }

        // 11. Pay artisan
        artisanWallet.balance += payment.artisanAmount;

        await artisanWallet.save({ session });

        // 12. Move money out of escrow
        platformWallet.escrowBalance -= payment.amount;

        // 13. Add platform fee
        platformWallet.balance += payment.platformFee;
        platformWallet.totalFees += payment.platformFee;

        await platformWallet.save({ session });

        // 14. Mark payment as released
        payment.status = "released";

        await payment.save({ session });

        // 15. Record artisan payment transaction
        await Transaction.create(
            [{
                user: artisanProfile.user,
                type: "escrow_release",
                amount: payment.artisanAmount,
                reference: `TX-ARTISAN-${Date.now()}`,
                status: "successful",
                description: `Escrow payment released for job ${job._id}`,
                job: job._id
            }],
            { session }
        );

        // 16. Record platform fee transaction
        await Transaction.create(
            [{
                user: null,
                type: "platform_fee",
                amount: payment.platformFee,
                reference: `TX-FEE-${Date.now()}`,
                status: "successful",
                description: `Platform fee for job ${job._id}`,
                job: job._id
            }],
            { session }
        );

        // 17. Commit everything
        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Escrow released successfully",
            payment
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

exports.getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({
            customer: req.user.userId
        })
            .populate("job", "title budget status")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: payments.length,
            payments
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};