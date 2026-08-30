const express = require("express");
const router = express.Router();

const jobController = require("../controllers/jobController");

const {
    protect,
    authorizeRoles
} = require('../middleware/authMiddleware');

router.post("/create-job",protect,authorizeRoles("customer"), jobController.createJob);
router.get("/my-jobs",protect,authorizeRoles("customer","artisan"), jobController.getMyJobs);
router.get("/open-jobs",protect,authorizeRoles("artisan"), jobController.getAvailableJobs);
router.patch("/:jobId/start", protect, authorizeRoles("artisan"), jobController.startJob);
router.patch("/:jobId/complete", protect, authorizeRoles("artisan"), jobController.completeJob);
router.patch("/:jobId/confirm", protect, authorizeRoles("customer"), jobController.confirmJob);



module.exports = router;
