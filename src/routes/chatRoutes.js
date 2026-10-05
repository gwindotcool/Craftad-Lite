const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const chatController = require("../controllers/chatController");

router.use(protect);

// 1. Get chat of logged-in user
router.get("/:jobId", chatController.getChatHistory);

module.exports = router;
