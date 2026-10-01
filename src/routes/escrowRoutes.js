const express = require("express");
const router = express.Router();

const escrowController = require("../controllers/escrowController");
const { protect } = require("../middleware/authMiddleware");
const { protectAdmin } = require("../middleware/adminAuth");


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
router.patch('/:id/resolve', protectAdmin, escrowController.resolveDispute)

module.exports = router;