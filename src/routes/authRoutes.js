const express = require("express");
const router = express.Router();
const {
    register,
    login,
    getProfile,
    registerFcmToken,
    removeFcmToken
} = require("../controllers/authController");

const {
    protect,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/profile",protect, getProfile);
router.post("/fcm-token", protect, registerFcmToken);
router.delete("/fcm-token", protect, removeFcmToken);




module.exports = router;