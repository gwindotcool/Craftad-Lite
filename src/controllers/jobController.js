const Job = require('../models/Job');
const ArtisanProfile = require("../models/ArtisanProfile");
const createNotification = require('../utils/notification')
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const PlatformWallet = require("../models/PlatformWallet");
const Transaction = require("../models/Transaction");
const redis = require("../config/redis");

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

        // THE INVALIDATOR: Delete the stale cache so the next request fetches the new job
        await redis.del("job_feed");

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
    const userId = req.user._id || req.user.id || req.user.userId;

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let jobs; // Must be let, not const, so we can reassign it below
        let query = {}; // We will build the query object based on the user role

        // Customer: query jobs they created
        if (req.user.role === "customer") {
            query = { customer: userId };
        }
        // Artisan: query jobs assigned to their profile
        else if (req.user.role === "artisan") {
            const artisanProfile = await ArtisanProfile.findOne({ user: userId }).select("-__v");
            if (!artisanProfile) {
                return res.status(404).json({ success: false, message: "Artisan profile not found" });
            }
            query = { assignedArtisan: artisanProfile._id };
        } else {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Get total count for pagination metadata based on the specific query
        const totalItems = await Job.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        // Fetch the paginated jobs, stripping out the __v field
        jobs = await Job.find(query)
            .select("-__v")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            count: jobs.length,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages
            },
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
        const skip = (page - 1) * limit;

        const fieldKey = `page:${page}:limit:${limit}`; // The inner field name

        // 1. Check Redis Hash for this specific page
        const cachedData = await redis.hGet("job_feed", fieldKey);

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            return res.status(200).json({
                success: true,
                count: parsedData.jobs.length,
                pagination: parsedData.pagination,
                source: "redis cache ⚡",
                jobs: parsedData.jobs
            });
        }

        // 2. Cache Miss: Query MongoDB
        const query = { status: "open" };
        const totalItems = await Job.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        const jobs = await Job.find(query)
            .select("-__v")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const responsePayload = {
            jobs,
            pagination: { page, limit, totalItems, totalPages }
        };

        // 3. Save to Redis Hash and set expiration on the whole hash
        await redis.hSet("job_feed", fieldKey, JSON.stringify(responsePayload));
        await redis.expire("job_feed", 3600); // Expires the entire hash in 1 hour

        return res.status(200).json({
            success: true,
            count: jobs.length,
            pagination: responsePayload.pagination,
            source: "mongodb 🐢",
            jobs
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};