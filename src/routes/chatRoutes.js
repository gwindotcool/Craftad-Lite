const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
    getOrCreateConversation,
    getUserConversations,
    getConversationMessages,
} = require("../controllers/chatController");

router.use(protect);

// 1. Get all conversations of logged-in user
router.get("/conversations", getUserConversations);

// 2. Start or get conversation for a job
router.post("/conversations", getOrCreateConversation);

// 3. Get message history for a conversation
router.get("/conversations/:conversationId/messages", getConversationMessages);

module.exports = router;