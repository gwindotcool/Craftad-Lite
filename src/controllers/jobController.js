const Job = require('../models/Job');
const ArtisanProfile = require("../models/ArtisanProfile");
const Application = require("../models/Application"); // FIXED: Added missing import
const createNotification = require('../utils/notification');
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const PlatformWallet = require("../models/PlatformWallet");
const Transaction = require("../models/Transaction");
const Escrow = require("../models/Escrow");
const crypto = require("crypto"); // FIXED: Needed for reference generation
const redis = require("../config/redis");


exports.createJob = async (req, res) => {
    try {
        const { title, description, category, budget, location } = req.body;
        const customerId = req.user.id; // FIXED: Standardized auth

        if (!title || !description || !category || !budget || !location) {
            return res.status(400).json({ success: false, message: "All job fields are required" });
        }

        const allowedCategories = ["electrician", "plumber", "carpenter", "mechanic", "welder", "painter", "cleaner"];

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({ success: false, message: "Invalid job category" });
        }

        if (Number(budget) <= 0) {
            return res.status(400).json({ success: false, message: "Budget must be greater than 0" });
        }

        const job = await Job.create({
            customer: customerId,
            title,
            description,
            category,
            budget: Number(budget),
            location
        });

        return res.status(201).json({ success: true, message: "Job created successfully", job });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.startJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const artisanUserId = req.user.id; // FIXED: Standardized auth

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        if (!job.assignedArtisan) {
            return res.status(400).json({ success: false, message: "No artisan has been assigned to this job" });
        }

        const artisanProfile = await ArtisanProfile.findOne({ user: artisanUserId });
        if (!artisanProfile) return res.status(404).json({ success: false, message: "Artisan profile not found" });

        if (job.assignedArtisan.toString() !== artisanProfile._id.toString()) {
            return res.status(403).json({ success: false, message: "You are not assigned to this job" });
        }

        if (job.status !== "assigned") {
            return res.status(400).json({ success: false, message: "Job cannot be started. Invalid status." });
        }

        job.status = "in_progress";
        await job.save();

        await createNotification({
            user: job.customer,
            sender: artisanUserId,
            type: "JOB_STARTED",
            title: "Job Started",
            message: "The artisan has started working on your job.",
            job: job._id
        });

        return res.status(200).json({ success: true, message: "Job started successfully", job });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.completeJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const artisanUserId = req.user.id; // FIXED: Standardized auth

        if (!artisanUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        if (job.status !== "in_progress") {
            return res.status(400).json({ success: false, message: "Job must be in progress to complete it" });
        }

        const artisanProfile = await ArtisanProfile.findOne({ user: artisanUserId });
        if (!artisanProfile || job.assignedArtisan.toString() !== artisanProfile._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the assigned artisan can mark this complete" });
        }

        job.status = "completed";
        await job.save();

        await createNotification({
            user: job.customer,
            sender: artisanUserId,
            type: "JOB_COMPLETED",
            title: "Job Completed by Artisan",
            message: "The artisan has marked the job as complete. Please review and confirm to release payment.",
            job: job._id
        });

        return res.status(200).json({ success: true, message: "Job marked as complete. Waiting for customer confirmation." });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.confirmJob = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { jobId } = req.params;
        const clientId = req.user.id;

        if (!clientId) throw new Error("Unauthorized: Missing user ID");

        const job = await Job.findById(jobId).session(session);
        if (!job) throw new Error("Job not found");

        if (job.customer.toString() !== clientId.toString()) {
            throw new Error("You are not allowed to confirm this job");
        }
        if (job.status !== "completed") {
            throw new Error("Job must be marked completed by the artisan first");
        }

        // 1. FIND AND LOCK THE ASSOCIATED ESCROW DOCUMENT (CRITICAL BRIDGE)
        const escrow = await Escrow.findOne({ job: jobId, escrowStatus: "HELD" }).session(session);
        if (!escrow) {
            throw new Error("Active escrow record not found for this job");
        }

        const artisanProfile = await ArtisanProfile.findById(job.assignedArtisan).session(session);
        if (!artisanProfile) throw new Error("Assigned artisan profile not found");

        const artisanUserId = artisanProfile.user;

        // 2. CALCULATE USING THE ESCROW AMOUNT (Source of Truth)
        const ESCROW_AMOUNT = escrow.amount;
        const PLATFORM_FEE = Math.floor(ESCROW_AMOUNT * 0.05);
        const ARTISAN_PAYOUT = ESCROW_AMOUNT - PLATFORM_FEE;

        // 3. UPDATE ESCROW STATE TO PREVENT RE-ENTRANCY
        escrow.escrowStatus = "RELEASED";
        escrow.platformFee = PLATFORM_FEE;
        await escrow.save({ session });

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

        const artisanWallet = await Wallet.findOneAndUpdate(
            { user: artisanUserId },
            { $inc: { balance: ARTISAN_PAYOUT } },
            { session, returnDocument: "after" }
        );

        if (!artisanWallet) throw new Error("Artisan wallet not found. Payout aborted.");

        await Transaction.insertMany([{
            user: artisanUserId,
            job: job._id,
            amount: ARTISAN_PAYOUT,
            type: "job_payment_release",
            status: "successful",
            reference: `PAYOUT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
            description: `Payment received for completed job: ${job.title}`
        }, {
            user: clientId,
            job: job._id,
            amount: PLATFORM_FEE,
            type: "platform_fee",
            status: "successful",
            reference: `FEE-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
            description: `Platform fee collected for job: ${job.title}`
        }], { session });

        job.status = "customer_confirmed";
        await job.save({ session });

        await session.commitTransaction();

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
        return res.status(400).json({ success: false, message: error.message });
    } finally {
        await session.endSession();
    }
};

exports.getMyJobs = async (req, res) => {
    const userId = req.user.id;

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit; // THE ACTUAL FIX

        let jobs;
        let query = {};

        if (req.user.role === "customer") {
            query = { customer: userId };
        } else if (req.user.role === "artisan") {
            const artisanProfile = await ArtisanProfile.findOne({ user: userId }).select("-__v");
            if (!artisanProfile) {
                return res.status(404).json({ success: false, message: "Artisan profile not found" });
            }
            query = { assignedArtisan: artisanProfile._id };
        } else {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const totalItems = await Job.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        jobs = await Job.find(query)
            .select("-__v")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            count: jobs.length,
            pagination: { page, limit, totalItems, totalPages },
            source: "mongodb 🐢",
            jobs
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAvailableJobs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit; // THE ACTUAL FIX

        const query = { status: "open" };
        const totalItems = await Job.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        const jobs = await Job.find(query)
            .select("-__v")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            count: jobs.length,
            pagination: { page, limit, totalItems, totalPages },
            source: "mongodb 🐢",
            jobs
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.rejectJob = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { jobId } = req.params;
        const artisanUserId = req.user.id;

        const artisanProfile = await ArtisanProfile.findOne({ user: artisanUserId }).session(session);
        if (!artisanProfile) throw new Error("Artisan profile not found.");

        const job = await Job.findOne({
            _id: jobId,
            assignedArtisan: artisanProfile._id,
            status: "assigned"
        }).session(session);

        if (!job) {
            return res.status(400).json({
                success: false,
                message: "Job cannot be rejected. It is either not assigned to you, already in progress, or completed."
            });
        }

        const refundAmount = job.agreedPrice;

        job.status = "open";
        job.assignedArtisan = null;
        job.agreedPrice = 0;
        await job.save({ session });

        await Application.findOneAndUpdate(
            { job: job._id, artisan: artisanUserId, status: "accepted" },
            { status: "withdrawn" },
            { session }
        );

        const platformWallet = await PlatformWallet.findOneAndUpdate(
            { key: "main" },
            { $inc: { escrowBalance: -refundAmount } },
            { session, new: true }
        );

        if (!platformWallet || platformWallet.escrowBalance < 0) {
            throw new Error("Critical Error: Escrow balance invariant violated.");
        }

        const clientWallet = await Wallet.findOneAndUpdate(
            { user: job.customer },
            { $inc: { balance: refundAmount } },
            { session, new: true }
        );

        if (!clientWallet) {
            throw new Error("Client wallet not found for refund.");
        }

        const refundRef = `REF-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
        await Transaction.create([{
            user: job.customer,
            job: job._id,
            amount: refundAmount,
            type: "escrow_refund",
            status: "successful",
            reference: refundRef,
            description: `Escrow refund: Artisan withdrew from job: ${job.title}`
        }], { session });

        await session.commitTransaction();

        await createNotification({
            user: job.customer,
            sender: artisanUserId,
            type: "JOB_REJECTED",
            title: "Artisan Withdrew",
            message: `The assigned artisan withdrew from '${job.title}'. Your escrowed funds of ${refundAmount} NGN have been fully refunded to your wallet.`,
            job: job._id
        });

        return res.status(200).json({
            success: true,
            message: "Job successfully rejected and funds refunded to the customer."
        });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error(`[Job Rejection Error - Job ${req.params?.jobId}]:`, error);

        return res.status(500).json({
            success: false,
            message: "Internal server error during job rejection. No funds were moved."
        });
    } finally {
        await session.endSession();
    }
};