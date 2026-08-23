const Job = require('../models/job');
const ArtisanProfile = require("../models/ArtisanProfile");

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

        // 1. Find the job
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // 2. Make sure an artisan is assigned
        if (!job.assignedArtisan) {
            return res.status(400).json({
                success: false,
                message: "No artisan has been assigned to this job"
            });
        }

        // 3. Find the logged-in artisan's profile
        const artisanProfile = await ArtisanProfile.findOne({
            user: req.user.userId
        });

        if (!artisanProfile) {
            return res.status(404).json({
                success: false,
                message: "Artisan profile not found"
            });
        }

        // 4. Make sure this is the assigned artisan
        if (
            job.assignedArtisan.toString() !==
            artisanProfile._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not assigned to this job"
            });
        }

        // 5. Job must be in progress
        if (job.status !== "in_progress") {
            return res.status(400).json({
                success: false,
                message: "Job cannot be completed"
            });
        }

        // 6. Mark job as completed
        job.status = "completed";

        await job.save();

        return res.status(200).json({
            success: true,
            message: "Job completed successfully",
            job
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.confirmJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        // 1. Find the job
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // 2. Make sure the logged-in user owns the job
        if (job.customer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to confirm this job"
            });
        }

        // 3. Job must be completed by the artisan first
        if (job.status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "Job has not been completed by the artisan"
            });
        }

        // 4. Confirm the job
        job.status = "customer_confirmed";

        await job.save();

        return res.status(200).json({
            success: true,
            message: "Job confirmed successfully",
            job
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getMyJobs = async (req, res) => {
    try {
        const jobs = await Job.find({customer: req.user.userId})
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            count: jobs.length,
            jobs
        })

    }catch(error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

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