const User = require("../models/User");

// @desc    Get all platform users (customers and artisans) with optional filters
// @route   GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        const { role, status, search } = req.query;
        let query = {};

        if (role) query.role = role;
        if (status === "suspended") query.isActive = false;
        if (status === "active") query.isActive = true;

        if (search) {
            query.$or = [
                { email: { $regex: search,$options: "i" } },
                { fullName: { $regex: search,$options: "i" } }
            ];
        }

        const users = await User.find(query).select("-password").sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Suspend or activate a user account
// @route   PATCH /api/admin/users/:userId/status
const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body; // Expects boolean: true (active) or false (suspended)

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid boolean value for 'isActive'"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.isActive = isActive;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User account has been ${isActive ? "activated" : "suspended"} successfully`,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// @desc    Verify or unverify an artisan account
// @route   PATCH /api/admin/users/:userId/verify
const verifyArtisan = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isVerified } = req.body; // Expects boolean: true or false

        if (typeof isVerified !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid boolean value for 'isVerified'"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role !== "artisan") {
            return res.status(400).json({
                success: false,
                message: "Target user is not an artisan. Verification only applies to artisans."
            });
        }
        if (user.isVerified === isVerified) {
            return res.status(400).json({
                success: false,
                message: `Artisan is already ${isVerified ? "verified" : "unverified"}`
            });
        }

        user.isVerified = isVerified;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Artisan account has been ${isVerified ? "verified" : "unverified"} successfully`,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = { getAllUsers, updateUserStatus, verifyArtisan };

