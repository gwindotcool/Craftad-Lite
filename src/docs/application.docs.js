/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Job application management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     Application:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68c123456789abcdef123456"
 *         artisan:
 *           type: string
 *           example: "68c223456789abcdef123456"
 *         job:
 *           type: string
 *           example: "68c323456789abcdef123456"
 *         message:
 *           type: string
 *           example: "I have experience handling residential plumbing installations."
 *         proposedPrice:
 *           type: number
 *           example: 45000
 *         status:
 *           type: string
 *           enum:
 *             - pending
 *             - accepted
 *             - rejected
 *           example: pending
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     ApplyForJobRequest:
 *       type: object
 *       required:
 *         - message
 *         - proposedPrice
 *       properties:
 *         message:
 *           type: string
 *           example: "I have 5 years of experience in plumbing and can complete this job professionally."
 *         proposedPrice:
 *           type: number
 *           minimum: 0
 *           example: 45000
 *
 *     ApplicationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Application created successfully"
 *         application:
 *           $ref: "#/components/schemas/Application"
 */


/**
 * @swagger
 * /api/applications/apply/{jobId}:
 *   post:
 *     summary: Apply for a job
 *     description: Allows an authenticated artisan to submit an application for an open job.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the job the artisan wants to apply for.
 *         example: "68c323456789abcdef123456"
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ApplyForJobRequest"
 *
 *     responses:
 *       201:
 *         description: Application created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApplicationResponse"
 *
 *       400:
 *         description: Bad request. The job may no longer be available or the artisan has already applied.
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
 *                   examples:
 *                     jobUnavailable:
 *                       value: "Job not available"
 *                     alreadyApplied:
 *                       value: "You have already applied for this job"
 *                     ownJob:
 *                       value: "You cannot apply to your own job"
 *
 *       401:
 *         description: Unauthorized. Authentication is required.
 *
 *       404:
 *         description: Job not found.
 *
 *       500:
 *         description: Server error.
 */


/**
 * @swagger
 * /api/applications/job/{jobId}:
 *   get:
 *     summary: Get applications for a job
 *     description: Returns all applications submitted for a specific job. Only the customer who owns the job can access its applications.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the job.
 *         example: "68c323456789abcdef123456"
 *
 *     responses:
 *       200:
 *         description: Applications retrieved successfully.
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
 *                   example: 3
 *                 applications:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Application"
 *
 *       401:
 *         description: Unauthorized. Authentication is required.
 *
 *       403:
 *         description: The authenticated user does not own this job.
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
 *                   example: "You are not allowed to view these applications"
 *
 *       404:
 *         description: Job not found.
 *
 *       500:
 *         description: Server error.
 */


/**
 * @swagger
 * /api/applications/accept/{applicationId}:
 *   patch:
 *     summary: Accept a job application
 *     description: Allows the customer who owns a job to accept a pending artisan application. The proposed price is deducted from the customer's wallet and transferred into platform escrow.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the application to accept.
 *         example: "68c423456789abcdef123456"
 *
 *     responses:
 *       200:
 *         description: Application accepted and funds secured in escrow.
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
 *                   example: "Application accepted and funds secured in escrow"
 *
 *       400:
 *         description: Bad request. Possible reasons include insufficient wallet funds, job no longer being available, or application no longer being pending.
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
 *                   examples:
 *                     insufficientFunds:
 *                       value: "Insufficient funds. Please fund your wallet with at least 45000 NGN."
 *                     jobUnavailable:
 *                       value: "Job is no longer available"
 *                     applicationNotPending:
 *                       value: "Application is no longer pending"
 *
 *       401:
 *         description: Unauthorized.
 *
 *       404:
 *         description: Application, job, or artisan profile not found.
 *
 *       500:
 *         description: Server error.
 */