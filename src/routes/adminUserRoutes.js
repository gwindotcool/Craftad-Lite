const express = require("express");
const router = express.Router();
const { getAllUsers, updateUserStatus,verifyArtisan } = require("../controllers/adminModerationController");
const { protectAdmin, restrictTo } = require("../middleware/adminAuth");

// Protect all admin user routes
router.use(protectAdmin);

// Get all users (Super Admin & Moderator)
router.get("/", getAllUsers);

// Suspend or activate a user (Super Admin & Moderator)
router.patch("/:userId/status", updateUserStatus);

// Verify or unverify an artisan
router.patch("/:userId/verify", verifyArtisan);

module.exports = router;