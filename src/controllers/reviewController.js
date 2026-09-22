const mongoose = require("mongoose");
const Review = require("../models/Review");
const Job = require("../models/Job");
const ArtisanProfile = require("../models/ArtisanProfile");

exports.createReview = async (req, res) => {

    const userId = req.user._id || req.user.id || req.user.userId;

    // 1. Initialize and start the session at the very top
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { jobId } = req.params;
        const { rating, comment } = req.body;

        // 2. Check rating exists
        if (!rating) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Rating is required"
            });
        }

        // 3. Make sure rating is between 1 and 5
        if (rating < 1 || rating > 5) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        // 4. Find the job
        const job = await Job.findById(jobId).session(session);

        if (!job) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // 5. Make sure customer owns the job
        if (job.customer.toString() !== userId) {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                message: "You are not allowed to review this job"
            });
        }

        // 6. Job must be customer confirmed or paid
        if (!["customer_confirmed", "paid"].includes(job.status)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Job must be confirmed before leaving a review"
            });
        }

        // 7. Make sure an artisan was assigned
        if (!job.assignedArtisan) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "No artisan was assigned to this job"
            });
        }

        // 8. Check whether this job already has a review
        const existingReview = await Review.findOne({
            job: jobId
        }).session(session);

        if (existingReview) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this job"
            });
        }

        // 9. Get artisan profile
        const artisanProfile = await ArtisanProfile.findById(
            job.assignedArtisan
        ).session(session);

        if (!artisanProfile) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Assigned artisan profile not found"
            });
        }

        // 10. Create review
        const review = await Review.create(
            [{
                customer:userId,
                artisan: artisanProfile.user,
                job: jobId,
                rating,
                comment
            }],
            { session }
        );

        // 11. Update artisan rating
        const totalRating =
            artisanProfile.ratingAverage * artisanProfile.totalReviews;

        artisanProfile.totalReviews += 1;

        artisanProfile.ratingAverage = Number(
            (
                (totalRating + Number(rating)) /
                artisanProfile.totalReviews
            ).toFixed(2)
        );

        await artisanProfile.save({ session });

        // 12. Commit everything atomically
        await session.commitTransaction();

        return res.status(201).json({
            success: true,
            message: "Review created successfully",
            review: review[0]
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        return res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        await session.endSession();
    }
};