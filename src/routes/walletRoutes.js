const express = require("express");
const router = express.Router();

const walletController = require("../controllers/walletController");

const {
    protect
} = require("../middleware/authMiddleware");

router.post("/fund", protect, walletController.fundWallet);

module.exports = router;