const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transactionController");

const {
    protect
} = require("../middleware/authMiddleware");

router.get(
    "/my",
    protect,
    transactionController.getMyTransactions
);

module.exports = router;