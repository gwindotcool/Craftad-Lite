const express = require("express");
const router = express.Router();

const walletController = require("../controllers/walletController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");


router.get(
    "/me",
    protect,
    walletController.getMyWallet
);

router.post(
    "/fund",
    protect,
    walletController.fundWallet
);
// Artisans must be logged in to verify accounts
router.post("/verify-bank", protect, authorizeRoles("artisan"), walletController.verifyBankAccount);

router.post("/add-bank", protect, authorizeRoles("artisan"), walletController.addWithdrawalBank);

router.post("/withdraw", protect, authorizeRoles("artisan"), walletController.requestWithdrawal);

module.exports = router;