const express = require("express");
const router = express.Router();

const reviewController = require("../controllers/reviewController");

const { protect, authorizeRoles } = require ("../middleware/authMiddleware");

router.post("/:jobId", protect, authorizeRoles("customer"), reviewController.createReview);

module.exports = router;