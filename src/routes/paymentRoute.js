const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");

const {
    protect,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.post("/fund/:jobId", protect, authorizeRoles("customer"),paymentController.fundJobEscrow);
router.patch("/release/:jobId", protect, authorizeRoles("customer"), paymentController.releaseEscrow);
router.get("/history", protect, authorizeRoles("customer"), paymentController.getMyPayments);

module.exports = router;