const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");

const {
    protect,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.post("/fund/:jobId", protect, authorizeRoles("customer"),paymentController.fundJobEscrow);
router.patch("/release/:jobId", protect, authorizeRoles("customer"), paymentController.releaseEscrow);

module.exports = router;