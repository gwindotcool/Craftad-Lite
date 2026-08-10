const express = require("express");
const router = express.Router();

const jobController = require("../controllers/jobController");

const {
    protect,
    authorizeRoles
} = require('../middleware/authMiddleware');

router.post("/create-job",protect,authorizeRoles("customer"), jobController.createJob);
router.get("/my-jobs",protect,authorizeRoles("customer"), jobController.getAllJobs);
router.get("/open-jobs",protect,authorizeRoles("artisan"), jobController.getAvailableJobs);



module.exports = router;
