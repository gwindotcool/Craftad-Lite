const Review = require("../models/Review");
const Job = require("../models/job");
const ArtisanProfile = require("../models/ArtisanProfile");

exports.createReview = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { rating, comment } = req.body;

        // 1. Check rating exists
        if (!rating) {
            return res.status(400).json({
                success: false,
                message: "Rating is required"
            });
        }

        // 2. Make sure rating is between 1 and 5
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        // 3. Find the job
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // 4. Make sure customer owns the job
        if (job.customer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to review this job"
            });
        }

        // 5. Job must be customer confirmed
        if (job.status !== "customer_confirmed") {
            return res.status(400).json({
                success: false,
                message: "Job must be confirmed before leaving a review"
            });
        }

        // 6. Make sure an artisan was assigned
        if (!job.assignedArtisan) {
            return res.status(400).json({
                success: false,
                message: "No artisan was assigned to this job"
            });
        }

        // 7. Check whether this job already has a review
        const existingReview = await Review.findOne({
            job: jobId
        });

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this job"
            });
        }

        // 8. Get artisan profile
        const artisanProfile = await ArtisanProfile.findById(
            job.assignedArtisan
        );

        if (!artisanProfile) {
            return res.status(404).json({
                success: false,
                message: "Artisan profile not found"
            });
        }

        // 9. Create review
        const review = await Review.create({
            customer: req.user.userId,
            artisan: artisanProfile.user,
            job: jobId,
            rating,
            comment
        });

        // 10. Update artisan rating
        const totalRating =
            artisanProfile.ratingAverage * artisanProfile.totalReviews;

        artisanProfile.totalReviews += 1;

        artisanProfile.ratingAverage = Number(
            (
                (totalRating + Number(rating)) /
                artisanProfile.totalReviews
            ).toFixed(2)
        );
        await artisanProfile.save();

        return res.status(201).json({
            success: true,
            message: "Review created successfully",
            review
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};