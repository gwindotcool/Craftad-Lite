const express = require("express");
const router = express.Router();

const walletController = require("../controllers/walletController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Wallet details
router.get("/me", protect, walletController.getMyWallet);

// Fund wallet (Matches the frontend /api/wallet/fund)
router.post("/deposit", protect, walletController.fundWallet);

// Artisans must be logged in to verify accounts (Added the missing slash)
router.get("/banks/resolve", protect, authorizeRoles("artisan"), walletController.resolveBank);
router.post("/banks", protect, authorizeRoles("artisan"), walletController.addWithdrawalBank);
router.post("/withdrawals", protect, authorizeRoles("artisan"), walletController.requestWithdrawal);

module.exports = router;