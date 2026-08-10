const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

const {
    protect,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.post("/apply/:jobId", protect, authorizeRoles("artisan"),applicationController.applyForJob);
router.get("/job/:jobId", protect, authorizeRoles("customer"), applicationController.getJobApplications);
router.patch("/accept/:applicationId", protect, authorizeRoles("customer"),applicationController.acceptApplication);

module.exports = router;