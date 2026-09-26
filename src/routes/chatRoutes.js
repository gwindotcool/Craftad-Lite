const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const chatController = require("../controllers/chatController");

router.use(protect);

// 1. Get all conversations of logged-in user
router.get("/:jobId",protect, chatController.getChatHistory);

module.exports = router;
