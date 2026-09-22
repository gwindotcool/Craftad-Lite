const Job = require('../models/Job');
const ArtisanProfile = require("../models/ArtisanProfile");
const createNotification = require('../utils/notification')
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const PlatformWallet = require("../models/PlatformWallet");
const Transaction = require("../models/Transaction");

exports.createJob = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            budget,
            location
        } = req.body;

        // Check required fields
        if (!title || !description || !category || !budget || !location) {
            return res.status(400).json({
                success: false,
                message: "All job fields are required"
            });
        }

        // Allowed job categories
        const allowedCategories = [
            "electrician",
            "plumber",
            "carpenter",
            "mechanic",
            "welder",
            "painter",
            "cleaner"
        ];

        // Check category
        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job category"
            });
        }

        // Check budget
        if (Number(budget) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Budget must be greater than 0"
            });
        }

        const job = await Job.create({
            customer: req.user.userId,
            title,
            description,
            category,
            budget: Number(budget),
            location
        });

        return res.status(201).json({
            success: true,
            message: "Job created successfully",
            job
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.startJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        // Find the job
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // Make sure a worker has been assigned
        if (!job.assignedArtisan) {
            return res.status(400).json({
                success: false,
                message: "No artisan has been assigned to this job"
            });
        }

        // Find the artisan profile belonging to logged-in user
        const artisanProfile = await ArtisanProfile.findOne({
            user: req.user.userId
        });

        if (!artisanProfile) {
            return res.status(404).json({
                success: false,
                message: "Artisan profile not found"
            });
        }

        // Make sure this artisan is the assigned artisan
        if (job.assignedArtisan.toString() !== artisanProfile._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not assigned to this job"
            });
        }

        // Job must be assigned before it can start
        if (job.status !== "assigned") {
            return res.status(400).json({
                success: false,
                message: "Job cannot be started"
            });
        }

        // Start the job
        job.status = "in_progress";

        await job.save();
        await createNotification({
            user: job.customer,
            sender: req.user.userId,
            type: "JOB_STARTED",
            title: "Job Started",
            message: "The artisan has started working on your job.",
            job: job._id
        });

        return res.status(200).json({
            success: true,
            message: "Job started successfully",
            job
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.completeJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const artisanUserId = req.user._id || req.user.id || req.user.userId;

        if (!artisanUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

        // 1. Find the job
        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        // 2. Validate Status
        if (job.status !== "in_progress") {
            return res.status(400).json({ success: false, message: "Job must be in progress to complete it" });
        }

        // 3. Validate this is the correct artisan
        const artisanProfile = await ArtisanProfile.findOne({ user: artisanUserId });
        if (!artisanProfile || job.assignedArtisan.toString() !== artisanProfile._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the assigned artisan can mark this complete" });
        }

        // 4. Update Status (NO MONEY MOVES HERE)
        job.status = "completed";
        await job.save();

        // 5. Notify the Client
        await createNotification({
            user: job.customer,
            sender: artisanUserId,
            type: "JOB_COMPLETED",
            title: "Job Completed by Artisan",
            message: "The artisan has marked the job as complete. Please review and confirm to release payment.",
            job: job._id
        });

        return res.status(200).json({
            success: true,
            message: "Job marked as complete. Waiting for customer confirmation."
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.confirmJob = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { jobId } = req.params;
        const clientId = req.user._id || req.user.id || req.user.userId;

        if (!clientId) throw new Error("Unauthorized: Missing user ID");

        // 1. Find the job
        const job = await Job.findById(jobId).session(session);
        if (!job) throw new Error("Job not found");

        // 2. Validate Ownership & Status
        if (job.customer.toString() !== clientId.toString()) {
            throw new Error("You are not allowed to confirm this job");
        }
        if (job.status !== "completed") {
            throw new Error("Job must be marked completed by the artisan first");
        }

        // 3. Find the assigned artisan's profile to get their underlying User ID
        const artisanProfile = await ArtisanProfile.findById(job.assignedArtisan).session(session);
        if (!artisanProfile) throw new Error("Assigned artisan profile not found");

        const artisanUserId = artisanProfile.user;

        // 4. Financial Math (5% Platform Fee)
        const ESCROW_AMOUNT = job.agreedPrice;
        const PLATFORM_FEE = Math.floor(ESCROW_AMOUNT * 0.05);
        const ARTISAN_PAYOUT = ESCROW_AMOUNT - PLATFORM_FEE;

        // 5. Drain Escrow & Collect Platform Fee (WITH THE KEY FIX)
        const platformWallet = await PlatformWallet.findOneAndUpdate(
            { key: "main" },
            {
                $inc: {
                    escrowBalance: -ESCROW_AMOUNT,
                    balance: PLATFORM_FEE,
                    totalFees: PLATFORM_FEE
                }
            },
            { session, returnDocument: "after", upsert: true }
        );

        if (!platformWallet || platformWallet.escrowBalance < 0) {
            throw new Error("Critical Error: Escrow balance fell below zero.");
        }

        // 6. Pay the Artisan
        const artisanWallet = await Wallet.findOneAndUpdate(
            { user: artisanUserId },
            { $inc: { balance: ARTISAN_PAYOUT } },
            { session, returnDocument: "after" }
        );

        if (!artisanWallet) throw new Error("Artisan wallet not found. Payout aborted.");

        // 7. Ledger Entries (Double-Entry Accounting)
        // 7. Ledger Entries (Double-Entry Accounting)
        await Transaction.insertMany([{
            user: artisanUserId,
            job: job._id,
            amount: ARTISAN_PAYOUT,
            type: "job_payment_release",
            status: "successful",
            reference: `PAYOUT-${Date.now()}`,
            description: `Payment received for completed job: ${job.title}`
        }, {
            user: clientId, // Client acts as the trigger for the fee
            job: job._id,
            amount: PLATFORM_FEE,
            type: "platform_fee",
            status: "successful",
            reference: `FEE-${Date.now()}`,
            description: `Platform fee collected for job: ${job.title}`
        }], { session });
        // 8. Confirm the job
        job.status = "customer_confirmed";
        await job.save({ session });

        // 9. Commit the transaction
        await session.commitTransaction();

        // 10. Notify Artisan
        await createNotification({
            user: artisanUserId,
            sender: clientId,
            type: "JOB_CONFIRMED",
            title: "Job Confirmed & Paid",
            message: `The client confirmed the job. ${ARTISAN_PAYOUT} NGN has been credited to your wallet.`,
            job: job._id
        });

        return res.status(200).json({
            success: true,
            message: "Job confirmed and funds released to artisan",
            data: {
                totalEscrowReleased: ESCROW_AMOUNT,
                artisanReceived: ARTISAN_PAYOUT,
                platformFee: PLATFORM_FEE
            }
        });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        return res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        await session.endSession();
    }
};

exports.getMyJobs = async (req, res) => {
    try {
        let jobs;

        // Customer: get jobs they created
        if (req.user.role === "customer") {
            jobs = await Job.find({
                customer: req.user.userId
            }).sort({ createdAt: -1 });
        }

        // Artisan: get jobs assigned to their artisan profile
        else if (req.user.role === "artisan") {
            const artisanProfile = await ArtisanProfile.findOne({
                user: req.user.userId
            });

            if (!artisanProfile) {
                return res.status(404).json({
                    success: false,
                    message: "Artisan profile not found"
                });
            }

            jobs = await Job.find({
                assignedArtisan: artisanProfile._id
            }).sort({ createdAt: -1 });
        }

        else {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        return res.status(200).json({
            success: true,
            count: jobs.length,
            jobs
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getAvailableJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ status: "open"}).sort({ createdAt: -1 })
        return res.status(200).json({
            success: true,
            count:jobs.length,
            jobs
        })
    }catch(error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}