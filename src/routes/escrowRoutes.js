const express = require("express");
const router = express.Router();

const escrowController = require("../controllers/escrowController");
const { protect } = require("../middleware/authMiddleware");
const { protectAdmin } = require("../middleware/adminAuth");

/**
 * @swagger
 * /api/escrow/{id}/release:
 *   patch:
 *     summary: Release escrow funds to the artisan
 *     description: Approves the completed job and releases the held funds to the artisan's wallet. Can only be triggered by the client who created the escrow.
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the escrow transaction
 *     responses:
 *       200:
 *         description: Funds released successfully.
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
 *                   example: "Funds have been released to the artisan successfully"
 *                 escrow:
 *                   type: object
 *                   description: The updated escrow document
 *       400:
 *         description: Bad Request - Escrow is not in HELD state, or unauthorized user.
 *       500:
 *         description: Internal Server Error
 */

router.patch('/:id/release', protect, escrowController.releaseEscrow);

/**
 * @swagger
 * /api/escrow/{id}/dispute:
 *   patch:
 *     summary: Raise a dispute on an active escrow
 *     description: Freezes the funds in an active escrow. Can only be triggered by the client who created the escrow.
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the escrow transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "The artisan did not finish the plumbing job as agreed."
 *     responses:
 *       200:
 *         description: Dispute raised successfully and funds frozen.
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
 *                   example: "Funds have been frozen and dispute raised successfully"
 *                 escrow:
 *                   type: object
 *                   description: The updated escrow document
 *       400:
 *         description: Bad Request - Missing reason, wrong state, or unauthorized.
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
 *                   example: "Validation Error: A dispute reason is required"
 *       500:
 *         description: Internal Server Error
 */

router.patch('/:id/dispute', protect, escrowController.raiseDispute)
/**
 * @swagger
 * /api/escrow/{id}/resolve:
 *   patch:
 *     summary: Resolve a dispute on an active escrow
 *     description: Forces a resolution on a disputed escrow. Super Admin access only.
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the escrow transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *                 enum: ["REFUNDED", "FORCED_RELEASED"]
 *                 example: "REFUNDED"
 *     responses:
 *       200:
 *         description: Dispute resolved successfully and funds moved.
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
 *                   example: "Dispute successfully resolved. Funds have been REFUNDED."
 *                 escrow:
 *                   type: object
 *       400:
 *         description: Bad Request - Invalid resolution string or escrow is not in DISPUTED state.
 *       500:
 *         description: Internal Server Error
 */

router.patch('/:id/resolve', protectAdmin, escrowController.resolveDispute)

module.exports = router;