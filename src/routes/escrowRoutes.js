const express = require("express");
const router = express.Router();

const escrowController = require("../controllers/escrowController");
const { protect } = require("../middleware/authMiddleware");
const { protectAdmin } = require("../middleware/adminAuth");

router.patch('/:id/release', protect, escrowController.releaseEscrow);

router.patch('/:id/dispute', protect, escrowController.raiseDispute)

router.patch('/:id/resolve', protectAdmin, escrowController.resolveDispute)

router.post("/fund/:jobId", protect, escrowController.fundEscrow);

module.exports = router;