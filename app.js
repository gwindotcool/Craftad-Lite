const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./src/routes/authRoutes");
const artisanRoutes = require("./src/routes/artisanRoutes");
const jobRoutes = require("./src/routes/jobRoutes");
const applicationRoutes = require("./src/routes/applicationRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const walletRoutes = require("./src/routes/walletRoutes");
const paymentRoute = require("./src/routes/paymentRoute");
const transactionRoutes = require("./src/routes/transactionRoutes");

app.use(
    cors({
        origin: "http://localhost:5173",
    })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/artisans", artisanRoutes);
app.use("/api/job", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/payments", paymentRoute);
app.use("/api/transactions", transactionRoutes);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Craftad API is running"
    });
});

module.exports = app;