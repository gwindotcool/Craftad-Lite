const express = require('express');
const router = express.Router();

const {createProfile} = require('../controllers/artisanController');

const {
    protect,
    authorizeRoles
} = require('../middleware/authMiddleware');

router.post(
    "/profile",
    protect,
    authorizeRoles("artisan"),
    createProfile
);

module.exports = router;