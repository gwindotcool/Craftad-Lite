const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const protectAdmin = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, no token provided"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "test_secret");

        // Ensure the admin exists and is active in the isolated Admin collection
        const admin = await Admin.findById(decoded.id).select("-password");
        if (!admin || !admin.isActive) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, admin account invalid or inactive"
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        console.log("Admin JWT Verification Error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Not authorized, token failed"
        });
    }
};

const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied: insufficient administrative permissions"
            });
        }
        next();
    };
};

module.exports = { protectAdmin, restrictTo };