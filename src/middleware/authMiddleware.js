const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token provided',
            });
        }

        const token = authHeader.split(" ")[1];

        // 1. Kill the hardcoded fallback. Fail fast if the environment is misconfigured.
        if (!process.env.JWT_SECRET) {
            console.error("CRITICAL: JWT_SECRET is missing in environment variables.");
            return res.status(500).json({ success: false, message: "Internal server misconfiguration" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 2. THE NORMALIZER: Extract the ID no matter how sloppy the login controller was
        const extractedId = decoded.id || decoded._id || decoded.userId;

        if (!extractedId) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, malformed token payload',
            });
        }

        // 3. Reconstruct a clean, predictable req.user object
        req.user = {
            id: extractedId,
            role: decoded.role // Required for authorizeRoles
            // Add any other strictly necessary fields here (e.g., email), but keep it lean
        };

        next();

    } catch (err) {
        // If it's a jwt expiration error, tell the client so they can refresh
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: "Not authorized, token expired" });
        }
        return res.status(401).json({
            success: false,
            message: "Not authorized, invalid token"
        });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Role not found on user object."
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Insufficient permissions.",
            });
        }
        next();
    }
};

module.exports = {
    protect,
    authorizeRoles,
};