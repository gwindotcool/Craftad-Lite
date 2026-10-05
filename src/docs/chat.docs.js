/**
 * @swagger
 * /api/chat/{jobId}:
 *   get:
 *     summary: Get chat history for a job
 *     description: Returns the chat messages for a specific job. Only the customer who owns the job or the artisan assigned to the job can access the chat history.
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         description: ID of the job whose chat history should be retrieved
 *         schema:
 *           type: string
 *           example: 68f123456789abcdef123456
 *
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
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *
 *       403:
 *         description: User is not part of this job
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Access denied. You are not part of this job.
 *
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Job not found
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */

/**
 * @swagger
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
 *           example: 68f123456789abcdef123456
 *
 *         job:
 *           type: string
 *           description: ID of the job associated with the message
 *           example: 68f123456789abcdef123456
 *
 *         sender:
 *           type: string
 *           description: ID of the user who sent the message
 *           example: 68f123456789abcdef123457
 *
 *         recipient:
 *           type: string
 *           description: ID of the user receiving the message
 *           example: 68f123456789abcdef123458
 *
 *         text:
 *           type: string
 *           description: Message content
 *           example: I have started working on the job.
 *
 *         isRead:
 *           type: boolean
 *           description: Indicates whether the recipient has read the message
 *           example: false
 *
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-10-04T10:30:00.000Z
 *
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2026-10-04T10:30:00.000Z
 */