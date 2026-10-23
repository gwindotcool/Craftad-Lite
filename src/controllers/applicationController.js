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
        const artisanId = req.user.id; // FIXED: Standardized auth

        if (!artisanId) return res.status(401).json({ success: false, message: "Unauthorized: Missing user ID" });

        const { proposedPrice, message } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });
        if (job.status !== "open") return res.status(400).json({ success: false, message: "Job not available" });

        if (job.customer.toString() === artisanId.toString()) {
            return res.status(400).json({ success: false, message: "You cannot apply to your own job" });
        }

        const existingApplication = await Application.findOne({ artisan: artisanId, job: jobId });
        if (existingApplication) {
            return res.status(400).json({ success: false, message: "You have already applied for this job" });
        }

        const application = await Application.create({
            artisan: artisanId,
            job: job._id,
            proposedPrice,
            message
        });

        await createNotification({
            user: job.customer,
            sender: artisanId,
            type: "JOB_APPLICATION",
            title: "New Job Application",
            message: "An artisan has applied for your job.",
            job: job._id
        });

        return res.status(201).json({ success: true, message: "Application created successfully", application });

    } catch (error) {
        console.error(`[Apply For Job Error - Artisan ${req.user?.id}]:`, error);
        // FIXED: Mask the raw database error
        return res.status(500).json({ success: false, message: "Internal server error while applying for job." });
    }
};

exports.getJobApplications = async (req, res) => {
    try {
        const { jobId } = req.params;
        const clientId = req.user.id; // FIXED: Standardized auth

        if (!clientId) return res.status(401).json({ success: false, message: "Unauthorized: Missing user ID" });

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        if (job.customer.toString() !== clientId.toString()) {
            return res.status(403).json({ success: false, message: "You are not allowed to view these applications" });
        }

        // FIXED: Added .lean() to strip Mongoose overhead for read-only queries
        const applications = await Application.find({ job: jobId })
            .populate("artisan", "fullName email")
            .lean();

        return res.status(200).json({ success: true, count: applications.length, applications });

    } catch (error) {
        console.error(`[Get Applications Error - Job ${req.params?.jobId}]:`, error);
        // FIXED: Mask the raw database error
        return res.status(500).json({ success: false, message: "Internal server error while fetching applications." });
    }
};

exports.acceptApplication = async (req, res) => {
    let session;
    let stage = "initializing";

    try {
        stage = "starting MongoDB session";
        session = await mongoose.startSession();

        stage = "starting transaction";
        session.startTransaction();

        stage = "reading application";

        const { applicationId } = req.params;
        const clientId = req.user.id; // Fixed: Assuming your middleware is cleaned up

        // 1. Find Application & Validate Pending Status atomically
        const application = await Application.findOne({
            _id: applicationId,
            status: "pending"
        }).session(session);

        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found or no longer pending." });
        }

        // 2. Fetch Artisan Profile FIRST so we only write to the Job once
        const artisanProfile = await ArtisanProfile.findOne({ user: application.artisan }).session(session);
        if (!artisanProfile) throw new Error("Artisan profile not found.");

        // 3. Atomically lock the Job, update status, set price, AND assign artisan in ONE query
        const job = await Job.findOneAndUpdate(
            { _id: application.job, customer: clientId, status: "open" },
            {
                $set: {
                    status: "assigned",
                    agreedPrice: application.proposedPrice,
                    assignedArtisan: artisanProfile._id
                }
            },
            { new: true, session }
        );

        if (!job) {
            return res.status(400).json({ success: false, message: "Job is no longer available or unauthorized." });
        }

        // 4. Atomically check and deduct from Client Wallet (Escrow Lock)
        const clientWallet = await Wallet.findOneAndUpdate(
            { user: clientId, balance: { $gte: application.proposedPrice } },
            { $inc: { balance: -application.proposedPrice } },
            { new: true, session }
        );

        if (!clientWallet) {
            throw new Error(`Insufficient funds. Please fund your wallet with at least ${application.proposedPrice} NGN.`);
        }

        // 5. Update Platform Escrow Balance
        await PlatformWallet.findOneAndUpdate(
            { key: "main" },
            { $inc: { escrowBalance: application.proposedPrice } },
            { upsert: true, session }
        );

        // 6. Ledger Entry
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

        // 7. Update Application Status
        application.status = "accepted";
        await application.save({ session });

        // 8. Bulk Reject Losers
        await Application.updateMany(
            { job: job._id, _id: { $ne: applicationId }, status: "pending" },
            { status: "rejected" },
            { session }
        );

        await session.commitTransaction();

        // 9. Fire Notification AFTER transaction commits (so if it fails, we don't send a false alarm)
        stage = "sending notification";

        try {
            await createNotification({
                user: application.artisan,
                sender: clientId,
                type: "APPLICATION_ACCEPTED",
                title: "You Got the Job!",
                message: `Your application for '${job.title}' was accepted. The funds are locked in escrow. You can now start the job.`,
                job: job._id
            });
        } catch (notificationError) {
            console.error(
                "[Application accepted, but notification failed]",
                notificationError.stack || notificationError
            );
        }

        return res.status(200).json({ success: true, message: "Application accepted and funds secured in escrow." });

    }catch (error) {
    if (session?.inTransaction()) {
        try {
            await session.abortTransaction();
        } catch (abortError) {
            console.error(
                "[Assignment rollback failed]",
                abortError
            );
        }
    }

    console.error("[Job Assignment Failed]", {
        stage,
        name: error.name,
        message: error.message,
        stack: error.stack,
        clientId: req.user?.id
    });

    return res.status(500).json({
        success: false,
        message: "Internal server error during job assignment."
    });
} finally {
    if (session) {
        await session.endSession();
    }
}
};


exports.rejectApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const clientId = req.user.id; // Fix your auth middleware!

        // 1. Find the application and populate the job so we can verify ownership
        const application = await Application.findById(applicationId).populate("job");

        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found." });
        }

        // 2. Security Check: Is this the customer who owns the job?
        if (application.job.customer.toString() !== clientId.toString()) {
            return res.status(403).json({ success: false, message: "You do not have permission to reject this application." });
        }

        // 3. State Check: Can only reject pending applications
        if (application.status !== "pending") {
            return res.status(400).json({ success: false, message: "Only pending applications can be rejected." });
        }

        // 4. Update the state
        application.status = "rejected";
        await application.save();

        // 5. Notify the Artisan
        await createNotification({
            user: application.artisan,
            sender: clientId,
            type: "APPLICATION_REJECTED",
            title: "Application Declined",
            message: `The client declined your application for '${application.job.title}'.`,
            job: application.job._id
        });

        return res.status(200).json({
            success: true,
            message: "Application successfully rejected."
        });

    } catch (error) {
        console.error(`[Reject Application Error - App ${req.params?.applicationId}]:`, error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while rejecting the application."
        });
    }
};