const express = require("express");

const router = express.Router();

const artisanController = require("../controllers/artisanController");

const {protect, authorizeRoles} = require("../middleware/authMiddleware");


router.post("/create", protect, authorizeRoles("artisan"), artisanController.createProfile);


router.get("/me", protect, authorizeRoles("artisan"), artisanController.getMyProfile);


router.patch("/update", protect, authorizeRoles("artisan"), artisanController.updateProfile);


module.exports = router;