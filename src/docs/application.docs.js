/**
 * @swagger
 * tags:
 *   - name: Applications
 *     description: Job application management
 *
 * components:
 *   schemas:
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
 *           enum: [pending, accepted, rejected, withdrawn, revoked_by_customer]
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
 *
 * /api/applications/job/{jobId}/apply:
 *   post:
 *     summary: Apply for a job
 *     description: Allows an authenticated artisan to submit an application for an open job.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the job the artisan wants to apply for.
 *         example: "68c323456789abcdef123456"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ApplyForJobRequest"
 *     responses:
 *       201:
 *         description: Application created successfully
 *       400:
 *         description: Bad request. Job unavailable, already applied, or attempting to apply to own job.
 *       401:
 *         description: Unauthorized. Authentication is required.
 *       404:
 *         description: Job not found.
 *       500:
 *         description: Server error.
 *
 * /api/applications/job/{jobId}:
 *   get:
 *     summary: Get applications for a job
 *     description: Returns all applications submitted for a specific job. Only the customer who owns the job can access its applications.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the job.
 *         example: "68c323456789abcdef123456"
 *     responses:
 *       200:
 *         description: Applications retrieved successfully.
 *       401:
 *         description: Unauthorized. Authentication is required.
 *       403:
 *         description: The authenticated user does not own this job.
 *       404:
 *         description: Job not found.
 *       500:
 *         description: Server error.
 *
 * /api/applications/{applicationId}/accept:
 *   patch:
 *     summary: Accept a job application
 *     description: Allows the customer who owns a job to accept a pending artisan application. The proposed price is deducted from the customer's wallet and transferred into platform escrow.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the application to accept.
 *         example: "68c423456789abcdef123456"
 *     responses:
 *       200:
 *         description: Application accepted and funds secured in escrow.
 *       400:
 *         description: Bad request. Insufficient wallet funds, job no longer available, or application no longer pending.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Application, job, or artisan profile not found.
 *       500:
 *         description: Server error.
 *
 * /api/applications/{applicationId}/reject:
 *   patch:
 *     summary: Reject a job application
 *     description: Explicitly decline an artisan's application.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the application to reject.
 *         example: "68c423456789abcdef123456"
 *     responses:
 *       200:
 *         description: Application rejected successfully.
 *       400:
 *         description: Bad request. Application no longer pending.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: The authenticated user does not own this job.
 *       404:
 *         description: Application not found.
 *       500:
 *         description: Server error.
 */