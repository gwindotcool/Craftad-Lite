/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet funding, balance, bank account, and withdrawal operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     BankDetails:
 *       type: object
 *       properties:
 *         accountName:
 *           type: string
 *           example: "John Doe"
 *         accountNumber:
 *           type: string
 *           example: "0123456789"
 *         bankCode:
 *           type: string
 *           example: "058"
 *         recipientCode:
 *           type: string
 *           example: "RCP_abc123xyz"
 *
 *     Wallet:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68c123456789abcdef123456"
 *         user:
 *           type: string
 *           example: "68c123456789abcdef123456"
 *         bankDetails:
 *           $ref: "#/components/schemas/BankDetails"
 *         balance:
 *           type: number
 *           example: 25000
 *         currency:
 *           type: string
 *           example: "NGN"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Transaction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68c123456789abcdef123456"
 *         amount:
 *           type: number
 *           example: 5000
 *         type:
 *           type: string
 *           enum: [credit, debit]
 *           example: "credit"
 *         status:
 *           type: string
 *           enum: [pending, successful, failed]
 *           example: "successful"
 *         reference:
 *           type: string
 *           example: "TRX_987654321"
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     FundWalletRequest:
 *       type: object
 *       required:
 *         - amount
 *       properties:
 *         amount:
 *           type: number
 *           minimum: 0
 *           exclusiveMinimum: true
 *           example: 10000
 *
 *     AddWithdrawalBankRequest:
 *       type: object
 *       required:
 *         - accountName
 *         - accountNumber
 *         - bankCode
 *       properties:
 *         accountName:
 *           type: string
 *           example: "John Doe"
 *         accountNumber:
 *           type: string
 *           example: "0123456789"
 *         bankCode:
 *           type: string
 *           example: "058"
 *
 *     WithdrawalRequest:
 *       type: object
 *       required:
 *         - amount
 *       properties:
 *         amount:
 *           type: number
 *           minimum: 1000
 *           example: 5000
 */


/**
 * @swagger
 * /api/wallet/me:
 *   get:
 *     summary: Get current user's wallet
 *     description: Returns the wallet belonging to the authenticated user.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 wallet:
 *                   $ref: "#/components/schemas/Wallet"
 *       500:
 *         description: Internal server error
 */


/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get transaction history
 *     description: Returns a paginated list of the authenticated user's wallet transactions.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
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
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Transaction"
 *       500:
 *         description: Internal server error
 */


/**
 * @swagger
 * /api/wallet/deposits:
 *   post:
 *     summary: Fund wallet
 *     description: Adds the specified amount to the authenticated user's wallet and records the funding transaction.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/FundWalletRequest"
 *     responses:
 *       200:
 *         description: Wallet funded successfully
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
 *                   example: "Wallet funded successfully"
 *                 wallet:
 *                   $ref: "#/components/schemas/Wallet"
 *       500:
 *         description: Internal server error
 */


/**
 * @swagger
 * /api/wallet/banks/resolve:
 *   get:
 *     summary: Verify a bank account
 *     description: Verifies a Nigerian bank account using the provided account number and bank code.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: accountNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: The 10-digit NUBAN
 *       - in: query
 *         name: bankCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The 3-digit CBN bank code
 *     responses:
 *       200:
 *         description: Bank account verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accountName:
 *                       type: string
 *                       example: "John Doe"
 *                     accountNumber:
 *                       type: string
 *                       example: "0123456789"
 *       400:
 *         description: Missing or invalid bank account details
 *       500:
 *         description: Internal server error
 */


/**
 * @swagger
 * /api/wallet/banks:
 *   post:
 *     summary: Add withdrawal bank account
 *     description: Registers the artisan's bank account as a transfer recipient.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AddWithdrawalBankRequest"
 *     responses:
 *       200:
 *         description: Bank account linked successfully
 *       400:
 *         description: Missing bank account information
 *       500:
 *         description: Internal server error
 */


/**
 * @swagger
 * /api/wallet/withdrawals:
 *   post:
 *     summary: Request wallet withdrawal
 *     description: Deducts the requested amount from the wallet and processes a withdrawal.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/WithdrawalRequest"
 *     responses:
 *       200:
 *         description: Withdrawal queued successfully
 *       400:
 *         description: Withdrawal could not be processed
 *       500:
 *         description: Internal server error
 */