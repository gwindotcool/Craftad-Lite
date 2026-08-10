const Job = require("../models/job");
const Application = require("../models/application");
const mongoose = require("mongoose");
const ArtisanProfile = require("../models/ArtisanProfile");

exports.applyForJob = async (req, res) => {
    try {
        // Get job ID from URL
        const { jobId } = req.params;

        // Get application details
        const {
            proposedPrice,
            message
        } = req.body;

        // Find the job
        const job = await Job.findById(jobId);

        // Job doesn't exist
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // Job is no longer available
        if (job.status !== "open") {
            return res.status(400).json({
                success: false,
                message: "Job not available"
            });
        }

        // Check if this artisan already applied
        const existingApplication = await Application.findOne({
            artisan: req.user.userId,
            job: jobId
        });

        if (existingApplication) {
            return res.status(400).json({
                success: false,
                message: "You have already applied for this job"
            });
        }

        // Create application
        const application = await Application.create({
            artisan: req.user.userId,
            job: jobId,
            proposedPrice,
            message
        });

        return res.status(201).json({
            success: true,
            message: "Application created successfully",
            application
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.getJobApplications = async (req, res) => {
    try {
        // 1. Get job ID from URL
        const { jobId } = req.params;

        // 2. Find the job
        const job = await Job.findById(jobId);

        // 3. Make sure the job exists
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // 4. Make sure this customer owns the job
        if (job.customer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view these applications"
            });
        }

        // 5. Find all applications for this job
        const applications = await Application.find({
            job: jobId
        }).populate("artisan", "fullName email");

        // 6. Return applications
        return res.status(200).json({
            success: true,
            count: applications.length,
            applications
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.acceptApplication = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { applicationId } = req.params;

        // 1. Find application
        const application = await Application.findById(applicationId)
            .session(session);

        if (!application) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        // 2. Find the job
        const job = await Job.findById(application.job)
            .session(session);

        if (!job) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // 3. Make sure customer owns the job
        if (job.customer.toString() !== req.user.userId) {
            await session.abortTransaction();

            return res.status(403).json({
                success: false,
                message: "You are not allowed to accept applications for this job"
            });
        }

        // 4. Make sure application is still pending
        if (application.status !== "pending") {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message: "Application is no longer pending"
            });
        }

        // 5. Find artisan profile
        const artisanProfile = await ArtisanProfile.findOne({
            user: application.artisan
        }).session(session);

        if (!artisanProfile) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Artisan profile not found"
            });
        }

        // 6. Accept selected application
        await Application.findByIdAndUpdate(
            applicationId,
            {
                status: "accepted"
            },
            { session }
        );

        // 7. Assign artisan to job
        await Job.findByIdAndUpdate(
            job._id,
            {
                status: "assigned",
                assignedArtisan: artisanProfile._id
            },
            { session }
        );

        // 8. Reject other pending applications
        await Application.updateMany(
            {
                job: job._id,
                _id: { $ne: applicationId },
                status: "pending"
            },
            {
                status: "rejected"
            },
            { session }
        );

        // 9. Commit everything
        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Application accepted successfully"
        });

    } catch (error) {

        // Undo all database changes if something fails
        await session.abortTransaction();

        return res.status(500).json({
            success: false,
            message: error.message
        });

    } finally {
        session.endSession();
    }
};