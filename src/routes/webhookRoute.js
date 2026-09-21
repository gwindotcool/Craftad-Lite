const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

// Apply express.raw() locally to this specific route
router.post(
    "/paystack",
    express.raw({ type: "application/json" }),
    webhookController.paystackWebhook
);

module.exports = router;