const ArtisanProfile = require("../models/ArtisanProfile");

exports.createProfile = async (req, res) => {
    try {
        const {
            skills,
            yearsOfExperience,
            bio,
            serviceAreas,
            serviceRadiusKm,
            location
        } = req.body;

        if (!skills || !Array.isArray(skills) || skills.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one skill is required"
            });
        }

        if (!location || !Array.isArray(location.coordinates)) {
            return res.status(400).json({
                success: false,
                message: "Valid location is required"
            });
        }

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
            skills,
            yearsOfExperience,
            bio,
            serviceAreas,
            serviceRadiusKm,
            location
        });

        return res.status(201).json({
            success: true,
            message: "Artisan profile created successfully",
            profile
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


exports.getMyProfile = async (req, res) => {
    try {
        const profile = await ArtisanProfile.findOne({
            user: req.user.userId
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Artisan profile not found"
            });
        }

        return res.status(200).json({
            success: true,
            artisan: profile
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


exports.updateProfile = async (req, res) => {
    try {
        const {
            skills,
            yearsOfExperience,
            bio,
            serviceAreas,
            serviceRadiusKm,
            location
        } = req.body;

        const profile = await ArtisanProfile.findOne({
            user: req.user.userId
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Artisan profile not found"
            });
        }

        if (skills !== undefined) {
            if (!Array.isArray(skills) || skills.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "At least one skill is required"
                });
            }

            profile.skills = skills;
        }

        if (yearsOfExperience !== undefined) {
            profile.yearsOfExperience = yearsOfExperience;
        }

        if (bio !== undefined) {
            profile.bio = bio;
        }

        if (serviceAreas !== undefined) {
            profile.serviceAreas = serviceAreas;
        }

        if (serviceRadiusKm !== undefined) {
            profile.serviceRadiusKm = serviceRadiusKm;
        }

        if (location !== undefined) {
            profile.location = location;
        }

        await profile.save();

        return res.status(200).json({
            success: true,
            message: "Artisan profile updated successfully",
            profile
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};