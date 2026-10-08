const mongoose = require("mongoose");
const Escrow = require("../models/Escrow");

exports.releaseEscrow = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const clientId = req.user._id || req.user.id || req.user.userId;
        const escrowId = req.params.id;

        // 1. Find and atomically lock the escrow record
        const escrow = await Escrow.findOne({ _id: escrowId, escrowStatus: "HELD" }).session(session);
        if (!escrow) {
            return res.status(404).json({
                success: false,
                message: "Escrow record not found or already released/refunded."
            });
        }

        // 2. Authorization
        if (escrow.client.toString() !== clientId.toString()) {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only the client can release these funds."
            });
        }

        // 3. Find the associated Job
        const job = await Job.findById(escrow.job).session(session);
        if (!job) {
            throw new Error("Associated job not found");
        }

        // 4. Update Escrow State
        escrow.escrowStatus = "RELEASED";
        await escrow.save({ session });

        // 5. Credit the Artisan's Wallet
        const artisanWallet = await Wallet.findOneAndUpdate(
            { user: escrow.artisan },
            { $inc: { balance: escrow.amount } },
            { new: true, session }
        );

        if (!artisanWallet) {
            throw new Error("Artisan wallet not found for payout");
        }

        // 6. Decrement Platform Escrow Balance
        await PlatformWallet.findOneAndUpdate(
            { key: "main" },
            { $inc: { escrowBalance: -escrow.amount } },
            { session }
        );

        // 7. Create Payout Transaction Ledger
        const payoutRef = `PAY-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
        await Transaction.create([{
            user: escrow.artisan,
            job: job._id,
            amount: escrow.amount,
            type: "job_payout",
            status: "successful",
            reference: payoutRef,
            description: `Payout released for completed job: ${job.title}`
        }], { session });

        // 8. Update Job Status to Completed
        job.status = "completed";
        await job.save({ session });

        // 9. Commit Transaction
        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Escrow released successfully. Funds transferred to artisan wallet."
        });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("Error releasing escrow:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error during escrow release"
        });
    } finally {
        await session.endSession();
    }
};
exports.raiseDispute = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const clientId = req.user._id || req.user.id || req.user.userId;
        const escrowId = req.params.id; // Get the specific transaction from URL
        const { reason } = req.body; // Client MUST provide a reason

        // 1. Payload validation
        if (!reason || reason.trim() === "") {
            throw new Error("Validation Error: A dispute reason is required");
        }

        // 2. Find the escrow
        const escrow = await Escrow.findById(escrowId).session(session);
        if (!escrow) {
            throw new Error("Escrow record not found");
        }

        // 3. Authorization: Only the paying client can dispute
        if (escrow.client.toString() !== clientId.toString()) {
            throw new Error("Unauthorized: Only the client can raise a dispute");
        }

        // 4. State Validation: Can only dispute funds that are currently HELD
        if (escrow.escrowStatus !== "HELD") {
            throw new Error(`Cannot dispute funds. Current status is ${escrow.escrowStatus}`);
        }

        // 5. Update State: Freeze the funds and attach the reason
        escrow.escrowStatus = "DISPUTED";
        escrow.disputeReason = reason;

        await escrow.save({ session });
        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Funds have been frozen and dispute raised successfully",
            escrow
        });

    } catch (error) {
        await session.abortTransaction();

        const statusCode = error.message.includes("Validation") || error.message.includes("Unauthorized") || error.message.includes("Cannot dispute") ? 400 : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    } finally {
        session.endSession();
    }
};

exports.resolveDispute = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const adminId = req.user._id || req.user.id || req.user.userId;
        const escrowId = req.params.id;
        const { resolution } = req.body;

        // 1. Strict Payload Validation: Accept ONLY these two exact strings
        const validResolutions = ["REFUNDED", "FORCED_RELEASED"];
        if (!validResolutions.includes(resolution)) {
            throw new Error('Validation Error: resolution must be exactly "REFUNDED" or "FORCED_RELEASED"');
        }

        // 2. Find the escrow record
        const escrow = await Escrow.findById(escrowId).session(session);
        if (!escrow) {
            throw new Error("Escrow record not found");
        }

        // 3. State Validation: You can ONLY resolve an escrow that is actively DISPUTED
        if (escrow.escrowStatus !== "DISPUTED") {
            throw new Error(`Cannot resolve escrow. Current status is ${escrow.escrowStatus}, expected DISPUTED.`);
        }

        // 4. Execute the Verdict
        escrow.escrowStatus = resolution;
        escrow.resolvedBy = adminId;
        escrow.disputeReason = escrow.disputeReason + ` [Resolved by Admin ${adminId}]`;

        await escrow.save({ session });
        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: `Dispute successfully resolved. Funds have been ${resolution}.`,
            escrow
        });

    } catch (error) {
        await session.abortTransaction();

        // 400 for bad input/state, 500 for actual server crashes
        const statusCode = error.message.includes("Validation") || error.message.includes("Cannot resolve") ? 400 : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    } finally {
        session.endSession();
    }
};
const Job = require("../models/Job");
const Wallet = require("../models/Wallet");
const Application = require("../models/Application");
const PlatformWallet = require("../models/PlatformWallet");
const Transaction = require("../models/Transaction");
const crypto = require("crypto");

exports.fundEscrow = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const clientId = req.user._id || req.user.id || req.user.userId;
        const jobId = req.params.jobId;

        // 1. Find the Job
        const job = await Job.findById(jobId).session(session);
        if (!job) {
            throw new Error("Job not found");
        }

        if (job.client.toString() !== clientId.toString()) {
            throw new Error("Unauthorized: Only the job owner can fund escrow");
        }

        if (job.status !== "open" && job.status !== "assigned") {
            throw new Error(`Cannot fund escrow for a job with status: ${job.status}`);
        }

        // 2. Find the accepted application to get the agreed price and artisan ID
        const application = await Application.findOne({ job: jobId, status: "accepted" }).session(session);
        if (!application) {
            throw new Error("No accepted application found for this job");
        }

        const amount = application.proposedPrice || job.budget;
        if (!amount || amount <= 0) {
            throw new Error("Invalid job funding amount");
        }

        // 3. Check Customer Wallet Balance
        const customerWallet = await Wallet.findOne({ user: clientId }).session(session);
        if (!customerWallet || customerWallet.balance < amount) {
            throw new Error("Insufficient wallet balance to fund escrow");
        }

        // 4. Check if Escrow already exists for this job
        const existingEscrow = await Escrow.findOne({ job: jobId }).session(session);
        if (existingEscrow) {
            throw new Error("Escrow has already been funded for this job");
        }

        // 5. Deduct from Customer Wallet
        customerWallet.balance -= amount;
        await customerWallet.save({ session });

        // 6. Create Escrow Record
        const escrow = await Escrow.create([{
            job: jobId,
            client: clientId,
            artisan: application.artisan,
            amount: amount,
            escrowStatus: "HELD"
        }], { session });

        // 7. Update Platform Escrow Balance (if you track it)
        await PlatformWallet.findOneAndUpdate(
            { key: "main" },
            { $inc: { escrowBalance: amount } },
            { upsert: true, new: true, session }
        );

        // 8. Create Transaction Ledger
        const ref = `ESC-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
        await Transaction.create([{
            user: clientId,
            job: jobId,
            amount: amount,
            type: "escrow_funded",
            status: "successful",
            reference: ref,
            description: `Escrow funded for job: ${job.title}`
        }], { session });

        // 9. Update Job Status to Assigned / In Progress
        job.status = "assigned";
        await job.save({ session });

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Escrow funded successfully",
            escrow: escrow[0]
        });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("Error funding escrow:", error.message);

        const statusCode = error.message.includes("Insufficient") || error.message.includes("Unauthorized") || error.message.includes("not found") ? 400 : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    } finally {
        session.endSession();
    }
};