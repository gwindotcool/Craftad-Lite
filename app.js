const express = require("express");
const cors = require("cors");
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();

const authRoutes = require("./src/routes/authRoutes");
const artisanRoutes = require("./src/routes/artisanRoutes");
const jobRoutes = require("./src/routes/jobRoutes");
const applicationRoutes = require("./src/routes/applicationRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const walletRoutes = require("./src/routes/walletRoutes");
const transactionRoutes = require("./src/routes/transactionRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const webhookRoute = require("./src/routes/webhookRoute");
const chatRoutes = require("./src/routes/chatRoutes");
const adminAuthRoutes = require("./src/routes/adminAuthRoutes");
const adminUserRoutes = require("./src/routes/adminUserRoutes");

// 1. WEBHOOKS (Must be before express.json() and before rate limiters)
app.use("/api/webhook", webhookRoute);

// 2. SECURITY HEADERS & CORS
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173" }));

// 3. RATE LIMITING (Placed after webhook, so webhook is ignored)
const limiter = rateLimit({
    max: 100,
    windowMs: 15 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in 15 minutes.'
});
app.use('/api', limiter);

// 4. BODY PARSER (Converts stream to req.body)
app.use(express.json());

// 5. DATA SANITIZATION (Express 5 Compatible Wrapper)
app.use((req, res, next) => {
    // We manually sanitize the objects in-place instead of letting
    // the package try (and fail) to reassign the read-only Express 5 properties.
    if (req.body) mongoSanitize.sanitize(req.body);
    if (req.query) mongoSanitize.sanitize(req.query);
    if (req.params) mongoSanitize.sanitize(req.params);
    next();
});

// 6. STANDARD API ROUTES

app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/artisans", artisanRoutes);
app.use("/api/job", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);

app.get("/api/health", (req, res) => {
    res.status(200).json({ success: true, message: "Craftad API is running securely" });
});

module.exports = app;