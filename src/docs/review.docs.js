/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Customer reviews and artisan ratings
 */

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     Review:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68c523456789abcdef123456"
 *         customer:
 *           type: string
 *           example: "68c123456789abcdef123456"
 *         artisan:
 *           type: string
 *           example: "68c223456789abcdef123456"
 *         job:
 *           type: string
 *           example: "68c323456789abcdef123456"
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           example: 5
 *         comment:
 *           type: string
 *           example: "Excellent work. The artisan completed the job professionally."
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */


/**
 * @swagger
 * /api/reviews/{jobId}:
 *   post:
 *     summary: Create a review for a completed job
 *     description: Allows a customer to review the artisan assigned to a job after the customer has confirmed the job or the job has been paid.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the job being reviewed.
 *         example: "68c323456789abcdef123456"
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Excellent work. The artisan completed the job professionally."
 *
 *     responses:
 *       201:
 *         description: Review created successfully.
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
 *                   example: "Review created successfully"
 *                 review:
 *                   $ref: "#/components/schemas/Review"
 *
 *       400:
 *         description: Bad request. The rating is missing or invalid, the job has not been confirmed, no artisan is assigned, or the job has already been reviewed.
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
 *                   example: "Rating is required"
 *
 *       401:
 *         description: Unauthorized. Authentication is required.
 *
 *       403:
 *         description: The authenticated customer does not own the job.
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
 *                   example: "You are not allowed to review this job"
 *
 *       404:
 *         description: Job or assigned artisan profile not found.
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
 *                   example: "Job not found"
 *
 *       500:
 *         description: Internal server error.
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
 *                   example: "Internal server error"
 */