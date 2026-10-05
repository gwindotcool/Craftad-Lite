```js
/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notification management
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get my notifications
 *     description: Returns notifications belonging to the authenticated user. Supports pagination and filtering for unread notifications.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of notifications per page
 *
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: When true, only unread notifications are returned
 *
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
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
 *                   example: 10
 *
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pages:
 *                       type: integer
 *                       example: 3
 *                     unreadCount:
 *                       type: integer
 *                       example: 4
 *
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Notification"
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications belonging to the authenticated user as read.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: All notifications marked as read
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
 *                   example: All notifications marked as read
 *
 *                 modifiedCount:
 *                   type: integer
 *                   example: 5
 *
 *       401:
 *         description: Unauthorized
 *
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     description: Marks a specific notification as read. The notification must belong to the authenticated user.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB notification ID
 *
 *     responses:
 *       200:
 *         description: Notification marked as read
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
 *                   example: Notification marked as read
 *
 *                 notification:
 *                   $ref: "#/components/schemas/Notification"
 *
 *       401:
 *         description: Unauthorized
 *
 *       404:
 *         description: Notification not found
 *
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     NotificationSender:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68c987654321abcdef654321
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         profilePicture:
 *           type: string
 *           nullable: true
 *           example: https://example.com/profile.jpg
 *
 *     NotificationJob:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68c123456789abcdef123456
 *         title:
 *           type: string
 *           example: Fix leaking kitchen pipe
 *         status:
 *           type: string
 *           example: open
 *
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68c123456789abcdef123456
 *
 *         user:
 *           type: string
 *           description: ID of the user receiving the notification
 *           example: 68c123456789abcdef123456
 *
 *         sender:
 *           nullable: true
 *           description: User who triggered the notification. The notification feed returns this field populated.
 *           oneOf:
 *             - type: string
 *             - $ref: "#/components/schemas/NotificationSender"
 *
 *         type:
 *           type: string
 *           enum:
 *             - JOB_APPLICATION
 *             - APPLICATION_ACCEPTED
 *             - JOB_STARTED
 *             - JOB_COMPLETED
 *             - JOB_CONFIRMED
 *             - PAYMENT_RELEASED
 *             - REVIEW_SUBMITTED
 *           example: JOB_APPLICATION
 *
 *         title:
 *           type: string
 *           example: New Job Application
 *
 *         message:
 *           type: string
 *           example: An artisan has applied for your job.
 *
 *         job:
 *           nullable: true
 *           description: Related job. The notification feed returns this field populated.
 *           oneOf:
 *             - type: string
 *             - $ref: "#/components/schemas/NotificationJob"
 *
 *         isRead:
 *           type: boolean
 *           example: false
 *
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
```
