const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const { loginAdmin, registerAdmin } = require("../controllers/adminAuthController");
const { protectAdmin, restrictTo } = require("../middleware/adminAuth");

router.post("/login", loginAdmin);

// Conditional registration using native Express middleware chaining:
// 1. First middleware checks if DB has 0 admins. If so, bypasses auth and registers directly.
// 2. If admins already exist, it calls `next()` to trigger protectAdmin -> restrictTo -> registerAdmin.
router.post(
    "/register",
    async (req, res, next) => {
        try {
            const count = await Admin.countDocuments();
            if (count === 0) {
                return registerAdmin(req, res);
            }
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    protectAdmin,
    restrictTo("super_admin"),
    registerAdmin
);


module.exports = router;