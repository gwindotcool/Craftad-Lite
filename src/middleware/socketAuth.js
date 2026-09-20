const jwt = require("jsonwebtoken");

const socketAuth = (socket, next) => {
    try {
        // Extract token from handshake auth or Authorization header
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.split(" ")[1];

        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user payload to socket for down-stream handlers
        socket.user = {
            userId: decoded.userId || decoded.id,
            role: decoded.role,
        };

        next();
    } catch (error) {
        return next(new Error("Authentication error: Invalid or expired token"));
    }
};

module.exports = socketAuth;