/**
 * @swagger
 * tags:
 *   - name: Jobs
 *     description: Job creation, management, and completion
 *
 * components:
 *   schemas:
 *
 *     Job:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique ID of the job
 *           example: "68c123456789abcdef123456"
 *
 *         customer:
 *           type: string
 *           description: ID of the customer who created the job
 *           example: "68c123456789abcdef123456"
 *
 *         title:
 *           type: string
 *           description: Short title describing the job
 *           example: "Fix leaking kitchen pipe"
 *
 *         description:
 *           type: string
 *           description: Detailed description of the work required
 *           example: "The main pipe under the kitchen sink is leaking."
 *
 *         category:
 *           type: string
 *           enum:
 *             - electrician
 *             - plumber
 *             - carpenter
 *             - mechanic
 *             - welder
 *             - painter
 *             - cleaner
 *           example: "plumber"
 *
 *         budget:
 *           type: number
 *           minimum: 0
 *           description: Customer's proposed budget for the job
 *           example: 25000
 *
 *         agreedPrice:
 *           type: number
 *           minimum: 0
 *           description: Final agreed price for the job
 *           example: 22000
 *
 *         location:
 *           type: string
 *           description: Job location
 *           example: "ibadan"
 *
 *         status:
 *           type: string
 *           enum:
 *             - open
 *             - assigned
 *             - in_progress
 *             - completed
 *             - customer_confirmed
 *             - paid
 *           example: "open"
 *
 *         assignedArtisan:
 *           type: string
 *           nullable: true
 *           description: ID of the assigned artisan profile
 *           example: "68c987654321abcdef654321"
 *
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-10-02T12:00:00.000Z"
 *
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-10-02T12:00:00.000Z"
 *
 *
 *     CreateJobRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - category
 *         - budget
 *         - location
 *       properties:
 *         title:
 *           type: string
 *           example: "Fix leaking kitchen pipe"
 *
 *         description:
 *           type: string
 *           example: "The main pipe under the kitchen sink is leaking."
 *
 *         category:
 *           type: string
 *           enum:
 *             - electrician
 *             - plumber
 *             - carpenter
 *             - mechanic
 *             - welder
 *             - painter
 *             - cleaner
 *           example: "plumber"
 *
 *         budget:
 *           type: number
 *           minimum: 0
 *           exclusiveMinimum: true
 *           description: Budget must be greater than zero
 *           example: 25000
 *
 *         location:
 *           type: string
 *           example: "Ibadan"
 *
 *
 * /api/job/create-job:
 *   post:
 *     summary: Create a new job
 *     description: Creates a new job for the authenticated customer.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobRequest'
 *
 *     responses:
 *       201:
 *         description: Job created successfully
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
 *                   example: "Job created successfully"
 *                 job:
 *                   $ref: '#/components/schemas/Job'
 *
 *       400:
 *         description: Missing required fields, invalid job category, or budget is not greater than zero
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
 *                   example: "All job fields are required"
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Internal server error
 *
 *
 * /api/job/my-jobs:
 *   get:
 *     summary: Get the authenticated user's jobs
 *     description: Returns jobs created by the authenticated customer or jobs assigned to the authenticated artisan. Results are paginated.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *         example: 1
 *
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of jobs to return per page
 *         example: 10
 *
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 count:
 *                   type: integer
 *                   example: 2
 *
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalItems:
 *                       type: integer
 *                       example: 2
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *
 *                 source:
 *                   type: string
 *                   example: "mongodb 🐢"
 *
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *
 *       401:
 *         description: Unauthorized
 *
 *       403:
 *         description: Access denied
 *
 *       404:
 *         description: Artisan profile not found
 *
 *       500:
 *         description: Internal server error
 *
 *
 * /api/job/open-jobs:
 *   get:
 *     summary: Get available open jobs
 *     description: Returns jobs with an open status that are available to artisans. Results are paginated and cached using Redis.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *         example: 1
 *
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of jobs to return per page
 *         example: 10
 *
 *     responses:
 *       200:
 *         description: Available jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 count:
 *                   type: integer
 *                   example: 5
 *
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalItems:
 *                       type: integer
 *                       example: 5
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *
 *                 source:
 *                   type: string
 *                   enum:
 *                     - "redis cache ⚡"
 *                     - "mongodb 🐢"
 *                   example: "redis cache ⚡"
 *
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Internal server error
 *
 *
 * /api/job/{jobId}/start:
 *   patch:
 *     summary: Start a job
 *     description: Allows the assigned artisan to start a job when its current status is assigned.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique ID of the job
 *         example: "68c123456789abcdef123456"
 *
 *     responses:
 *       200:
 *         description: Job started successfully
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
 *                   example: "Job started successfully"
 *                 job:
 *                   $ref: '#/components/schemas/Job'
 *
 *       400:
 *         description: Job has no assigned artisan or is not in the assigned state
 *
 *       401:
 *         description: Unauthorized
 *
 *       403:
 *         description: Authenticated artisan is not assigned to the job
 *
 *       404:
 *         description: Job or artisan profile not found
 *
 *       500:
 *         description: Internal server error
 *
 *
 * /api/job/{jobId}/complete:
 *   patch:
 *     summary: Mark a job as completed
 *     description: Allows the assigned artisan to mark an in-progress job as completed. Payment is not released by this endpoint.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique ID of the job
 *         example: "68c123456789abcdef123456"
 *
 *     responses:
 *       200:
 *         description: Job marked as completed and is waiting for customer confirmation
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
 *                   example: "Job marked as complete. Waiting for customer confirmation."
 *
 *       400:
 *         description: Job is not currently in progress
 *
 *       401:
 *         description: Unauthorized
 *
 *       403:
 *         description: Only the assigned artisan can mark the job as completed
 *
 *       404:
 *         description: Job not found
 *
 *       500:
 *         description: Internal server error
 *
 *
 * /api/job/{jobId}/confirm:
 *   patch:
 *     summary: Confirm a completed job
 *     description: Allows the customer who created the job to confirm completion. The escrow amount is released, a 5 percent platform fee is deducted, and the remaining amount is credited to the artisan's wallet.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique ID of the job
 *         example: "68c123456789abcdef123456"
 *
 *     responses:
 *       200:
 *         description: Job confirmed and funds released to the artisan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: "Job confirmed and funds released to artisan"
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalEscrowReleased:
 *                       type: number
 *                       example: 22000
 *                     artisanReceived:
 *                       type: number
 *                       example: 20900
 *                     platformFee:
 *                       type: number
 *                       example: 1100
 *
 *       400:
 *         description: Job not found, unauthorized, job is not completed, customer is not the job owner, artisan profile is missing, wallet is missing, or financial transaction failed
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Internal server error
 */