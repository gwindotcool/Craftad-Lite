/**
 * @swagger
 * /api/transactions/my:
 *   get:
 *     summary: Get my transactions
 *     description: Returns the transaction history of the currently authenticated user, ordered from newest to oldest.
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
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
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Transaction"
 *
 *       401:
 *         description: Unauthorized - authentication is required
 *
 *       500:
 *         description: Internal server error
 */