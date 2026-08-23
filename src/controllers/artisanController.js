const ArtisanProfile = require("../models/ArtisanProfile");

exports.createProfile = async (req, res) => {
    try {
        const {
            category,
            bio,
            yearsOfExperience,
            hourlyRate,
            serviceLocation
        } = req.body;

        const existingProfile = await ArtisanProfile.findOne({
            user: req.user.userId

        });

        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: "Artisan profile already exists"
            });
        }

        const profile = await ArtisanProfile.create({
            user: req.user.userId,
            category,
            bio,
            yearsOfExperience,
            hourlyRate,
            serviceLocation
        });

        res.status(201).json({
            success: true,
            message: "Artisan profile created successfully",
            profile
        });




    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })

    }
};