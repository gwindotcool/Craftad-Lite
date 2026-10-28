/**
 * @swagger
 * /api/chat/{jobId}:
 *   get:
 *     summary: Get chat history for a job
 *     description: Retrieves paginated chat messages for a job. Access is restricted to the customer who owns the job and the user account belonging to the assigned artisan.
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         description: MongoDB ID of the job
 *         schema:
 *           type: string
 *           example: 68f123456789abcdef123456
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number for paginated results
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Maximum number of messages per page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 50
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       401:
 *         description: Authentication is required or the token is invalid
 *       403:
 *         description: The authenticated user is not a participant in this job
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Send a chat message
 *     description: Sends and stores a message in a job conversation. Only the customer who owns the job or the user account belonging to the assigned artisan can send messages.
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         description: MongoDB ID of the job associated with the conversation
 *         schema:
 *           type: string
 *           example: 68f123456789abcdef123456
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 description: Text content of the message
 *                 example: Hello, I would like to discuss the job.
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Message sent successfully.
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Message text is empty or the job has no assigned artisan
 *       401:
 *         description: Authentication is required or the token is invalid
 *       403:
 *         description: The authenticated user is not a participant in this job
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 *
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       required:
 *         - job
 *         - sender
 *         - recipient
 *         - text
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique ID of the message
 *           example: 68f123456789abcdef123456
 *         job:
 *           type: string
 *           description: ID of the associated job
 *           example: 68f123456789abcdef123456
 *         sender:
 *           type: string
 *           description: ID of the user who sent the message
 *           example: 68f123456789abcdef123457
 *         recipient:
 *           type: string
 *           description: ID of the receiving user
 *           example: 68f123456789abcdef123458
 *         text:
 *           type: string
 *           description: Message content
 *           example: I have started working on the job.
 *         isRead:
 *           type: boolean
 *           description: Whether the message has been marked as read
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Message creation timestamp
 *           example: '2026-10-28T10:30:00.000Z'
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: '2026-10-28T10:30:00.000Z'
 */