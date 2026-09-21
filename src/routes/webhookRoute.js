const express = require("express");
const router = express.Router();

const webhookController = require("../controllers/webhookController");

router.post("/paystack",  webhookController.paystackWebhook)

module.exports = router;