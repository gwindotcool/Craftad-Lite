const Job = require("../models/Job");
const Application = require("../models/application");
const mongoose = require("mongoose");
const ArtisanProfile = require("../models/ArtisanProfile");
const createNotification = require("../utils/notification");
const PlatformWallet = require("../models/PlatformWallet");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

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

        // 1. Find Application & Job
        const application = await Application.findById(applicationId).session(session);
        if (!application) throw new Error("Application not found");

        const job = await Job.findById(application.job).session(session);
        if (!job) throw new Error("Job not found");

        // 2. Validate Ownership & Status
        if (job.customer.toString() !== clientId.toString()) {
            throw new Error("You are not authorized to accept applications for this job");
        }
        if (job.status !== "open") throw new Error("Job is no longer available");
        if (application.status !== "pending") throw new Error("Application is no longer pending");

        // 3. THE ESCROW CHECK: Can the client afford this?
        const clientWallet = await Wallet.findOne({ user: clientId }).session(session);
        if (!clientWallet || clientWallet.balance < application.proposedPrice) {
            throw new Error(`Insufficient funds. Please fund your wallet with at least ${application.proposedPrice} NGN.`);
        }

        // 4. Secure the Bag: Deduct from Client, move to Escrow
        clientWallet.balance -= application.proposedPrice;
        await clientWallet.save({ session });

        const platformWallet = await PlatformWallet.findOneAndUpdate(
            { key: "main" },
            {},
            {
                $inc: { escrowBalance: application.proposedPrice } },
            { upsert: true, session, returnDocument: "after" }, // <-- Fixed
        { session, returnDocument: "after", upsert: true }
        );

        // 5. Create the Escrow Transaction Ledger
        await Transaction.create([{
            user: clientId,
            job: job._id,
            amount: application.proposedPrice,
            type: "job_payment_escrow",
            status: "successful",
            reference: `ESC-${Date.now()}`,
            description: `Escrow lock for job: ${job.title}`
        }], { session });

        // 6. Find Artisan Profile & Update Statuses
        const artisanProfile = await ArtisanProfile.findOne({ user: application.artisan }).session(session);
        if (!artisanProfile) throw new Error("Artisan profile not found");

        application.status = "accepted";
        await application.save({ session });

        job.status = "assigned";
        job.assignedArtisan = artisanProfile._id;
        job.agreedPrice = application.proposedPrice;
        await job.save({ session });

        // 7. Bulk Reject Losers
        await Application.updateMany(
            { job: job._id, _id: { $ne: applicationId }, status: "pending" },
            { status: "rejected" },
            { session }
        );

        // 8. Commit
        await session.commitTransaction();

        // 9. Notifications (Post-transaction)
        await createNotification({
            user: application.artisan,
            sender: clientId,
            type: "APPLICATION_ACCEPTED",
            title: "Application Accepted",
            message: "Your application was accepted and funds are secured in escrow.",
            job: job._id
        });

        return res.status(200).json({
            success: true,
            message: "Application accepted and funds secured in escrow"
        });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        return res.status(error.message.includes("Insufficient funds") ? 400 : 500).json({
            success: false,
            message: error.message
        });
    } finally {
        await session.endSession();
    }
};