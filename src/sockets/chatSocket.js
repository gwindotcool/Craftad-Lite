const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

module.exports = (io, socket) => {
    const userId = socket.user.userId;

    socket.join(`user:${userId}`);

    // 1. Join Conversation Room
    socket.on("join_conversation", async ({ conversationId }) => {
        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return socket.emit("error", { message: "Conversation not found" });
            }

            const isCustomer = conversation.customer.toString() === userId;
            const isArtisan = conversation.artisan.toString() === userId;

            if (!isCustomer && !isArtisan) {
                return socket.emit("error", { message: "Unauthorized access" });
            }

            const roomName = `conversation:${conversationId}`;
            socket.join(roomName);
            socket.emit("joined_room", { room: roomName, conversationId });
        } catch (error) {
            socket.emit("error", { message: error.message });
        }
    });

    // 2. Typing Indicator Events
    socket.on("typing", ({ conversationId }) => {
        const roomName = `conversation:${conversationId}`;
        // Broadcast to everyone in the room EXCEPT the sender
        socket.to(roomName).emit("user_typing", {
            conversationId,
            userId,
        });
    });

    socket.on("stop_typing", ({ conversationId }) => {
        const roomName = `conversation:${conversationId}`;
        socket.to(roomName).emit("user_stopped_typing", {
            conversationId,
            userId,
        });
    });

    // 3. Real-Time Mark Messages as Read
    socket.on("mark_messages_read", async ({ conversationId }) => {
        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return socket.emit("error", { message: "Conversation not found" });
            }

            // Mark all unread messages sent TO this user as read
            const result = await Message.updateMany(
                {
                    conversation: conversationId,
                    recipient: userId,
                    isRead: false,
                },
                { $set: { isRead: true } }
            );

            if (result.modifiedCount > 0) {
                const roomName = `conversation:${conversationId}`;

                // Notify the conversation room so the sender's UI updates read status (double blue ticks)
                io.to(roomName).emit("messages_read_receipt", {
                    conversationId,
                    readBy: userId,
                    readCount: result.modifiedCount,
                });
            }
        } catch (error) {
            socket.emit("error", { message: error.message });
        }
    });

    // 4. Send Message
    socket.on("send_message", async ({ conversationId, text }) => {
        try {
            if (!text || !text.trim()) {
                return socket.emit("error", { message: "Message text cannot be empty" });
            }

            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return socket.emit("error", { message: "Conversation not found" });
            }

            const isCustomer = conversation.customer.toString() === userId;
            const recipientId = isCustomer ? conversation.artisan : conversation.customer;

            const newMessage = await Message.create({
                conversation: conversationId,
                sender: userId,
                recipient: recipientId,
                text: text.trim(),
            });

            conversation.lastMessage = text.trim();
            conversation.lastMessageAt = new Date();
            await conversation.save();

            const roomName = `conversation:${conversationId}`;

            io.to(roomName).emit("new_message", {
                message: newMessage,
                conversationId,
            });

            io.to(`user:${recipientId}`).emit("unread_message_alert", {
                conversationId,
                senderId: userId,
            });
        } catch (error) {
            socket.emit("error", { message: error.message });
        }
    });

    socket.on("leave_conversation", ({ conversationId }) => {
        socket.leave(`conversation:${conversationId}`);
    });

    socket.on("disconnect", (reason) => {
        console.log(`Socket disconnected: User ${userId} (${reason})`);
    });
};