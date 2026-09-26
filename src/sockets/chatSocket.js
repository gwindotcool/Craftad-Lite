const Message = require("../models/Message");
const Job = require("../models/Job");

module.exports = (io, socket) => {
    const userId = socket.user.userId;

    socket.join(`user:${userId}`);

    // 1. Join job Room
    socket.on("join_job", async ({ jobId }) => {
        try {
            // Populate assignedArtisan so we can access .user
            const job = await Job.findById(jobId).populate("assignedArtisan");

            if (!job) {
                return socket.emit("error", { message: "Job not found" });
            }

            const isCustomer = job.customer.toString() === userId;

            // Now we check against the actual User ID inside the profile
            const isArtisan = job.assignedArtisan && job.assignedArtisan.user.toString() === userId;

            if (!isCustomer && !isArtisan) {
                return socket.emit("error", { message: "Unauthorized access" });
            }

            const roomName = `job:${jobId}`;
            socket.join(roomName);
            socket.emit("joined_room", { room: roomName, jobId });
        } catch (error) {
            socket.emit("error", { message: error.message });
        }
    });

    // 2. Typing Indicator Events
    socket.on("typing", ({ jobId }) => {
        const roomName = `job:${jobId}`;
        // Broadcast to everyone in the room EXCEPT the sender
        socket.to(roomName).emit("user_typing", {
            jobId,
            userId,
        });
    });

    socket.on("stop_typing", ({ jobId }) => {
        const roomName = `job:${jobId}`;
        socket.to(roomName).emit("user_stopped_typing", {
            jobId,
            userId,
        });
    });

    // 3. Real-Time Mark Messages as Read
    socket.on("mark_messages_read", async ({ jobId }) => {
        try {
            const job = await Job.findById(jobId);
            if (!job) {
                return socket.emit("error", { message: "job not found" });
            }

            // Mark all unread messages sent TO this user as read
            const result = await Message.updateMany(
                {
                    job: jobId,
                    recipient: userId,
                    isRead: false,
                },
                { $set: { isRead: true } }
            );

            if (result.modifiedCount > 0) {
                const roomName = `job:${jobId}`;

                // Notify the job room so the sender's UI updates read status (double blue ticks)
                io.to(roomName).emit("messages_read_receipt", {
                    jobId,
                    readBy: userId,
                    readCount: result.modifiedCount,
                });
            }
        } catch (error) {
            socket.emit("error", { message: error.message });
        }
    });

    // 4. Send Message
    socket.on("send_message", async ({ jobId, text }) => {
        try {
            if (!text || !text.trim()) {
                return socket.emit("error", { message: "Message text cannot be empty" });
            }
            // Populate assignedArtisan so we can access .user
            const job = await Job.findById(jobId).populate("assignedArtisan");

            if (!job) {
                return socket.emit("error", { message: "job not found" });
            }
            const isCustomer = job.customer.toString() === userId;

            // Now we check against the actual User ID inside the profile
            const isArtisan = job.assignedArtisan && job.assignedArtisan.user.toString() === userId;

            if (!isCustomer && !isArtisan) {
                return socket.emit("error", { message: "Unauthorized access" });
            }
            const recipientId = isCustomer ? job.assignedArtisan.user : job.customer;

            const newMessage = await Message.create({
                job: jobId,
                sender: userId,
                recipient: recipientId,
                text: text.trim(),
            });

            job.lastMessage = text.trim();
            job.lastMessageAt = new Date();
            await job.save();

            const roomName = `job:${jobId}`;

            io.to(roomName).emit("new_message", {
                message: newMessage,
                jobId,
            });

            io.to(`user:${recipientId}`).emit("unread_message_alert", {
                jobId,
                senderId: userId,
            });
        } catch (error) {
            socket.emit("error", { message: error.message });
        }
    });

    socket.on("leave_job", ({ jobId }) => {
        socket.leave(`job:${jobId}`);
    });

    socket.on("disconnect", (reason) => {
        console.log(`Socket disconnected: User ${userId} (${reason})`);
    });
};