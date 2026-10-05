/**
 * @swagger
 * tags:
 *   name: Artisan
 *   description: Artisan profile management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     ArtisanLocation:
 *       type: object
 *       required:
 *         - type
 *         - coordinates
 *       properties:
 *         type:
 *           type: string
 *           enum:
 *             - Point
 *           example: "Point"
 *         coordinates:
 *           type: array
 *           minItems: 2
 *           maxItems: 2
 *           description: GeoJSON coordinates in [longitude, latitude] order.
 *           items:
 *             type: number
 *           example:
 *             - 3.3792
 *             - 6.5244
 *
 *     ArtisanProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68c123456789abcdef123456"
 *         user:
 *           type: string
 *           example: "68c987654321abcdef654321"
 *         skills:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: string
 *           example:
 *             - "plumbing"
 *             - "pipe repair"
 *         yearsOfExperience:
 *           type: number
 *           minimum: 0
 *           example: 5
 *         bio:
 *           type: string
 *           example: "Experienced plumber specializing in residential plumbing repairs."
 *         serviceAreas:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - "Ikeja"
 *             - "Yaba"
 *             - "Lekki"
 *         serviceRadiusKm:
 *           type: number
 *           minimum: 1
 *           example: 10
 *         location:
 *           $ref: "#/components/schemas/ArtisanLocation"
 *         ratingAverage:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *           example: 4.5
 *         totalJobsCompleted:
 *           type: number
 *           minimum: 0
 *           example: 25
 *         totalReviews:
 *           type: number
 *           minimum: 0
 *           example: 18
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CreateArtisanProfileRequest:
 *       type: object
 *       required:
 *         - skills
 *         - yearsOfExperience
 *         - location
 *       properties:
 *         skills:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: string
 *           example:
 *             - "plumbing"
 *             - "pipe repair"
 *         yearsOfExperience:
 *           type: number
 *           minimum: 0
 *           example: 5
 *         bio:
 *           type: string
 *           example: "Experienced plumber specializing in residential plumbing repairs."
 *         serviceAreas:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - "Ikeja"
 *             - "Yaba"
 *         serviceRadiusKm:
 *           type: number
 *           minimum: 1
 *           default: 10
 *           example: 10
 *         location:
 *           $ref: "#/components/schemas/ArtisanLocation"
 *
 *     UpdateArtisanProfileRequest:
 *       type: object
 *       properties:
 *         skills:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: string
 *           example:
 *             - "plumbing"
 *             - "pipe repair"
 *             - "water heater repair"
 *         yearsOfExperience:
 *           type: number
 *           minimum: 0
 *           example: 6
 *         bio:
 *           type: string
 *           example: "Experienced plumber with residential and commercial experience."
 *         serviceAreas:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - "Ikeja"
 *             - "Yaba"
 *             - "Lekki"
 *         serviceRadiusKm:
 *           type: number
 *           minimum: 1
 *           example: 15
 *         location:
 *           $ref: "#/components/schemas/ArtisanLocation"
 */


/**
 * @swagger
 * /api/artisans/create:
 *   post:
 *     summary: Create artisan profile
 *     description: Creates an artisan profile for the currently authenticated artisan.
 *     tags: [Artisan]
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateArtisanProfileRequest"
 *
 *     responses:
 *       201:
 *         description: Artisan profile created successfully
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
 *                   example: "Artisan profile created successfully"
 *                 profile:
 *                   $ref: "#/components/schemas/ArtisanProfile"
 *
 *       400:
 *         description: Invalid request data or artisan profile already exists
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
 *                     missingSkills:
 *                       value: "At least one skill is required"
 *                     invalidLocation:
 *                       value: "Valid location is required"
 *                     existingProfile:
 *                       value: "Artisan profile already exists"
 *
 *       401:
 *         description: Authentication required
 *
 *       403:
 *         description: Only users with the artisan role can create an artisan profile
 *
 *       500:
 *         description: Internal server error or database validation error
 */


/**
 * @swagger
 * /api/artisans/me:
 *   get:
 *     summary: Get current artisan profile
 *     description: Returns the artisan profile belonging to the currently authenticated artisan.
 *     tags: [Artisan]
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Artisan profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 artisan:
 *                   $ref: "#/components/schemas/ArtisanProfile"
 *
 *       401:
 *         description: Authentication required
 *
 *       403:
 *         description: Only users with the artisan role can access this endpoint
 *
 *       404:
 *         description: Artisan profile not found
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
 *                   example: "Artisan profile not found"
 *
 *       500:
 *         description: Internal server error
 */


/**
 * @swagger
 * /api/artisans/update:
 *   patch:
 *     summary: Update artisan profile
 *     description: Updates the profile of the currently authenticated artisan. Only fields included in the request are updated.
 *     tags: [Artisan]
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateArtisanProfileRequest"
 *
 *     responses:
 *       200:
 *         description: Artisan profile updated successfully
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
 *                   example: "Artisan profile updated successfully"
 *                 profile:
 *                   $ref: "#/components/schemas/ArtisanProfile"
 *
 *       400:
 *         description: Invalid skills value
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
 *                   example: "At least one skill is required"
 *
 *       401:
 *         description: Authentication required
 *
 *       403:
 *         description: Only users with the artisan role can update an artisan profile
 *
 *       404:
 *         description: Artisan profile not found
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
 *                   example: "Artisan profile not found"
 *
 *       500:
 *         description: Internal server error or database validation error
 */