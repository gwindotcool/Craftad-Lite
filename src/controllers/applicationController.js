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
        const artisanId = req.user.id;

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
        return res.status(500).json({ success: false, message: "Internal server error while applying for job." });
    }
};

exports.getJobApplications = async (req, res) => {
    try {
        const { jobId } = req.params;
        const clientId = req.user.id;

        if (!clientId) return res.status(401).json({ success: false, message: "Unauthorized: Missing user ID" });

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        if (job.customer.toString() !== clientId.toString()) {
            return res.status(403).json({ success: false, message: "You are not allowed to view these applications" });
        }

        const applications = await Application.find({ job: jobId })
            .populate("artisan", "fullName email")
            .lean();

        return res.status(200).json({ success: true, count: applications.length, applications });

    } catch (error) {
        console.error(`[Get Applications Error - Job ${req.params?.jobId}]:`, error);
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
        const clientId = req.user.id;

        const application = await Application.findOne({
            _id: applicationId,
            status: "pending"
        }).session(session);

        if (!application) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Application not found or no longer pending." });
        }

        let artisanProfile = await ArtisanProfile.findOne({ user: application.artisan }).session(session);
        if (!artisanProfile) {
            const created = await ArtisanProfile.create([{
                user: application.artisan,
                skills: ["general"],
                yearsOfExperience: 0,
                bio: "Profile created when the application was accepted.",
                location: { type: "Point", coordinates: [3.3792, 6.5244] }
            }], { session });
            artisanProfile = created[0];
        }

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
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Job is no longer available or unauthorized." });
        }

        const clientWallet = await Wallet.findOneAndUpdate(
            { user: clientId, balance: { $gte: application.proposedPrice } },
            { $inc: { balance: -application.proposedPrice } },
            { new: true, session }
        );

        if (!clientWallet) {
            throw new Error(`Insufficient funds. Please fund your wallet with at least ${application.proposedPrice} NGN.`);
        }

        await PlatformWallet.findOneAndUpdate(
            { key: "main" },
            { $inc: { escrowBalance: application.proposedPrice } },
            { upsert: true, session }
        );

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

        application.status = "accepted";
        await application.save({ session });

        await Application.updateMany(
            { job: job._id, _id: { $ne: applicationId }, status: "pending" },
            { status: "rejected" },
            { session }
        );

        await session.commitTransaction();

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
            console.error("[Application accepted, but notification failed]", notificationError.stack || notificationError);
        }

        return res.status(200).json({ success: true, message: "Application accepted and funds secured in escrow." });

    } catch (error) {
        if (session?.inTransaction()) {
            try {
                await session.abortTransaction();
            } catch (abortError) {
                console.error("[Assignment rollback failed]", abortError);
            }
        }

        console.error("[Job Assignment Failed]", {
            stage,
            name: error.name,
            message: error.message,
            stack: error.stack,
            clientId: req.user?.id
        });

        const message = error.message || "Internal server error during job assignment.";
        const clientError = /Insufficient funds|no longer available|not found|validation/i.test(message);

        return res.status(clientError ? 400 : 500).json({
            success: false,
            message
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
        const clientId = req.user.id;

        const application = await Application.findById(applicationId).populate("job");

        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found." });
        }

        if (application.job.customer.toString() !== clientId.toString()) {
            return res.status(403).json({ success: false, message: "You do not have permission to reject this application." });
        }

        if (application.status !== "pending") {
            return res.status(400).json({ success: false, message: "Only pending applications can be rejected." });
        }

        application.status = "rejected";
        await application.save();

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
