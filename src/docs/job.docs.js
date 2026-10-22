/**
 * @swagger
 * tags:
 *   - name: Jobs
 *     description: Job creation, management, escrow, and completion
 *   - name: Applications
 *     description: Artisan bidding and customer negotiation engine
 *
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique ID of the job
 *           example: "68c123456789abcdef123456"
 *         customer:
 *           type: string
 *           description: ID of the customer who created the job
 *         title:
 *           type: string
 *           example: "Fix leaking kitchen pipe"
 *         description:
 *           type: string
 *           example: "The main pipe under the kitchen sink is leaking."
 *         category:
 *           type: string
 *           enum: [electrician, plumber, carpenter, mechanic, welder, painter, cleaner]
 *           example: "plumber"
 *         budget:
 *           type: number
 *           description: Customer's proposed budget
 *           example: 25000
 *         agreedPrice:
 *           type: number
 *           description: Final agreed price
 *           example: 22000
 *         location:
 *           type: string
 *           example: "Ibadan"
 *         status:
 *           type: string
 *           enum: [open, assigned, in_progress, completed, customer_confirmed, paid]
 *           example: "open"
 *         assignedArtisan:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Application:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         artisan:
 *           type: string
 *         job:
 *           type: string
 *         proposedPrice:
 *           type: number
 *           example: 22000
 *         message:
 *           type: string
 *           example: "I have 5 years experience and can fix this today."
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected, withdrawn, revoked_by_customer]
 *           example: "pending"
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     CreateJobRequest:
 *       type: object
 *       required: [title, description, category, budget, location]
 *       properties:
 *         title:
 *           type: string
 *           example: "Fix leaking kitchen pipe"
 *         description:
 *           type: string
 *           example: "The main pipe under the kitchen sink is leaking."
 *         category:
 *           type: string
 *           enum: [electrician, plumber, carpenter, mechanic, welder, painter, cleaner]
 *         budget:
 *           type: number
 *           minimum: 1
 *           example: 25000
 *         location:
 *           type: string
 *           example: "Ibadan"
 *
 * /api/job/create-job:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobRequest'
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *
 * /api/job/my-jobs:
 *   get:
 *     summary: Get the authenticated user's jobs
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *       401:
 *         description: Authentication required
 *
 * /api/job/open-jobs:
 *   get:
 *     summary: Get open jobs for artisans
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Available jobs retrieved successfully
 *       401:
 *         description: Authentication required
 *
 * /api/job/{jobId}/start:
 *   patch:
 *     summary: Artisan starts an assigned job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job started
 *       401:
 *         description: Authentication required
 *
 * /api/job/{jobId}/complete:
 *   patch:
 *     summary: Artisan marks a job as completed
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job completed and awaiting customer confirmation
 *
 * /api/job/{jobId}/confirm:
 *   patch:
 *     summary: Customer confirms job completion
 *     description: Confirms completion and triggers the backend's payment-release flow.
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job completion confirmed
 *
 * /api/job/{jobId}/reject:
 *   patch:
 *     summary: Artisan rejects an assigned job
 *     description: The backend determines the job-status and any applicable escrow-refund behavior.
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job rejection processed
 *
 * /api/applications/apply/{jobId}:
 *   post:
 *     summary: Artisan applies for a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [proposedPrice, message]
 *             properties:
 *               proposedPrice:
 *                 type: number
 *                 example: 22000
 *               message:
 *                 type: string
 *                 example: "I have 5 years experience and can fix this today."
 *     responses:
 *       201:
 *         description: Application submitted
 *       401:
 *         description: Authentication required
 *
 * /api/applications/job/{jobId}:
 *   get:
 *     summary: Get applications for a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job applications retrieved successfully
 *
 * /api/applications/accept/{applicationId}:
 *   patch:
 *     summary: Customer accepts an application
 *     description: Accepts an application and triggers the backend's job-assignment and escrow flow.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application accepted
 *
 * /api/applications/{applicationId}/reject:
 *   patch:
 *     summary: Customer rejects an application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application rejected
 */

