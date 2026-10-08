const Job = require("../models/Job");
const Application = require("../models/Application");
const mongoose = require("mongoose");
const ArtisanProfile = require("../models/ArtisanProfile");
const createNotification = require("../utils/notification");
const PlatformWallet = require("../models/PlatformWallet");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const crypto = require("crypto");

exports.applyForJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        // 1. Extract the ID safely
        const artisanId = req.user._id || req.user.id || req.user.userId;

        if (!artisanId) return res.status(401).json({ success: false, message: "Unauthorized: Missing user ID" });

        const { proposedPrice, message } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });
        if (job.status !== "open") return res.status(400).json({ success: false, message: "Job not available" });

        // 2. Use the safe artisanId, not req.user.userId
        if (job.customer.toString() === artisanId.toString()) {
            throw new Error("You cannot apply to your own job");
        }

        // 3. Use the safe artisanId
        const existingApplication = await Application.findOne({ artisan: artisanId, job: jobId });
        if (existingApplication) {
            return res.status(400).json({ success: false, message: "You have already applied for this job" });
        }

        // 4. Match the schema exactly
        const application = await Application.create({
            artisan: artisanId,
            job: job._id,
            proposedPrice,
            message
        });

        // 5. Use the safe artisanId
        await createNotification({
            user: job.customer,
            sender: artisanId,
            type: "JOB_APPLICATION",
            title: "New Job Application",
            message: "An artisan has applied for your job.",
            job: job._id
        });

        return res.status(201).json({ success: true, message: "Application created successfully", application });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getJobApplications = async (req, res) => {
    try {
        const { jobId } = req.params;
        // 1. Extract the ID safely!
        const clientId = req.user._id || req.user.id || req.user.userId;

        if (!clientId) return res.status(401).json({ success: false, message: "Unauthorized: Missing user ID" });

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        // 2. Use the safe clientId and enforce string comparison
        if (job.customer.toString() !== clientId.toString()) {
            return res.status(403).json({ success: false, message: "You are not allowed to view these applications" });
        }

        const applications = await Application.find({ job: jobId }).populate("artisan", "fullName email");

        return res.status(200).json({ success: true, count: applications.length, applications });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.acceptApplication = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { applicationId } = req.params;
        const clientId = req.user._id || req.user.id || req.user.userId;

        // 1. Find Application & Validate Ownership/Pending Status atomically
        const application = await Application.findOne({
            _id: applicationId,
            status: "pending"
        }).session(session);

        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found or no longer pending" });
        }

        // 2. Atomically lock and update the Job status from "open" to "assigned"
        // This prevents race conditions if multiple requests hit this simultaneously
        const job = await Job.findOneAndUpdate(
            { _id: application.job, customer: clientId, status: "open" },
            {
                $set: {
                    status: "assigned",
                    agreedPrice: application.proposedPrice
                }
            },
            { new: true, session }
        );

        if (!job) {
            return res.status(400).json({
                success: false,
                message: "Job is no longer available, unauthorized, or already assigned."
            });
        }

        // 3. Atomically check and deduct from Client Wallet (Escrow Lock)
        const clientWallet = await Wallet.findOneAndUpdate(
            { user: clientId, balance: { $gte: application.proposedPrice } },
            { $inc: { balance: -application.proposedPrice } },
            { new: true, session }
        );

        if (!clientWallet) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Insufficient funds. Please fund your wallet with at least ${application.proposedPrice} NGN.`
            });
        }

        // 4. Update Platform Escrow Balance
        await PlatformWallet.findOneAndUpdate(
            { key: "main" },
            { $inc: { escrowBalance: application.proposedPrice } },
            { upsert: true, session }
        );

        // 5. Create the Escrow Transaction Ledger (Using cryptographically secure reference)
        const escrowRef = `ESC-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
        await Transaction.create([{
            user: clientId,
            job: job._id,
            amount: application.proposedPrice,
            type: "job_payment_escrow",
            status: "successful",
            reference: escrowRef,
            description: `Escrow lock for job: ${job.title}`
        }], { session });

        // 6. Find Artisan Profile & Update Application Status
        const artisanProfile = await ArtisanProfile.findOne({ user: application.artisan }).session(session);
        if (!artisanProfile) {
            throw new Error("Artisan profile not found"); // Will trigger catch block (500)
        }

        application.status = "accepted";
        job.assignedArtisan = artisanProfile._id;

        await application.save({ session });
        await job.save({ session });

        // 7. Bulk Reject Losers
        await Application.updateMany(
            { job: job._id, _id: { $ne: applicationId }, status: "pending" },
            { status: "rejected" },
            { session }
        );

        // 8. Commit Transaction
        await session.commitTransaction();

        // 9. Post-transaction notification (non-blocking failure or standard async)
        // Add your notification logic here...

        return res.status(200).json({
            success: true,
            message: "Application accepted and funds secured in escrow"
        });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("Error accepting application:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error during job assignment"
        });
    } finally {
        await session.endSession();
    }
};