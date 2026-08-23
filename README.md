# Craftad Lite

Craftad Lite is a backend API for a service marketplace that connects customers with skilled artisans.

Customers can create jobs, artisans can apply for jobs, customers can accept applications, artisans can complete assigned jobs, and completed jobs can be paid through an internal wallet and escrow system.

## Features

### Authentication and Authorization

* User registration and login
* Password hashing with bcrypt
* JWT-based authentication
* Protected routes
* Role-based authorization for customers and artisans
* Resource ownership checks

### Artisan Management

* Artisan profiles
* Artisan skills and experience
* Role-based access to artisan functionality

### Job Management

* Customers can create jobs
* Artisans can view available jobs
* Artisans can apply for jobs
* Customers can view applications
* Customers can accept applications
* Accepted artisans are assigned to jobs
* Customers can view their own jobs
* Job status management

### Job Lifecycle

```text
open
  ↓
assigned
  ↓
in_progress
  ↓
completed
  ↓
customer_confirmed
```

### Wallet and Escrow Payments

* Customer wallets
* Platform wallet
* Internal wallet funding
* Escrow funding
* Artisan payouts
* Platform fees
* Escrow release
* Transaction history
* Duplicate payment protection
* Duplicate escrow-release protection
* MongoDB transactions for atomic financial operations

### Escrow Payment Flow

```text
Customer creates job
        ↓
Artisan applies
        ↓
Customer accepts application
        ↓
Job is assigned
        ↓
Customer funds escrow
        ↓
Artisan starts job
        ↓
Artisan completes job
        ↓
Customer confirms job
        ↓
Escrow is released
        ├── 90% → Artisan
        └── 10% → Platform
```

For a ₦20,000 job:

```text
Job Amount:       ₦20,000
Platform Fee:      ₦2,000
Artisan Amount:   ₦18,000
```

The platform fee is calculated as 10% of the job budget.

## Tech Stack

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcrypt
* Postman for API testing

## Project Structure

```text
Craftad-Lite/
├── src/
│   ├── controllers/
│   │   ├── applicationController.js
│   │   ├── jobController.js
│   │   ├── paymentController.js
│   │   └── walletController.js
│   │
│   ├── middleware/
│   │   └── authMiddleware.js
│   │
│   ├── models/
│   │   ├── Application.js
│   │   ├── ArtisanProfile.js
│   │   ├── Job.js
│   │   ├── Payment.js
│   │   ├── PlatformWallet.js
│   │   ├── Transaction.js
│   │   ├── User.js
│   │   └── Wallet.js
│   │
│   └── routes/
│       ├── applicationRoutes.js
│       ├── artisanRoutes.js
│       ├── authRoutes.js
│       ├── jobRoutes.js
│       ├── paymentRoute.js
│       ├── reviewRoutes.js
│       └── walletRoutes.js
│
├── app.js
├── package.json
├── .gitignore
└── README.md
```

## Installation

Clone the repository:

```bash
git clone https://github.com/gwindotcool/Craftad-Lite.git
cd Craftad-Lite
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Do not commit `.env` to GitHub.

The repository `.gitignore` excludes:

```text
node_modules/
.env
.idea/
```

## Running the Project

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The API runs on:

```text
http://localhost:3000
```

## Authentication

Authentication is handled through JWT.

After a successful login, the API returns a JWT token.

Protected endpoints require:

```http
Authorization: Bearer <JWT_TOKEN>
```

The application currently supports two main roles:

```text
customer
artisan
```

Customers and artisans are restricted to operations appropriate for their roles.

## API Endpoints

### Health Check

```http
GET /api/health
```

Returns the current API status.

### Authentication

```text
/api/auth
```

Handles user registration and authentication.

### Artisan Management

```text
/api/artisans
```

Handles artisan profile operations.

### Jobs

```http
POST  /api/job/create-job
GET   /api/job/my-jobs
GET   /api/job/open-jobs
PATCH /api/job/:jobId/start
PATCH /api/job/:jobId/complete
PATCH /api/job/:jobId/confirm
```

#### Customer Operations

Customers can:

* Create jobs
* View their own jobs
* Confirm completed jobs

#### Artisan Operations

Artisans can:

* View open jobs
* Start assigned jobs
* Complete assigned jobs

### Applications

```text
/api/applications
```

Handles artisan job applications and customer application management.

The application lifecycle is:

```text
pending
  ↓
accepted
```

or:

```text
pending
  ↓
rejected
```

An artisan cannot apply to the same job more than once.

### Reviews

```text
/api/reviews
```

Handles job reviews and ratings.

### Wallet

```text
/api/wallet
```

Handles internal wallet operations.

The wallet system is used to simulate customer funds for the project.

### Payments

```http
POST  /api/payments/fund/:jobId
PATCH /api/payments/release/:jobId
```

#### Fund Escrow

A customer can fund a job only when:

* The customer owns the job
* The job has been assigned to an artisan
* The customer has sufficient wallet balance
* No existing payment exists for the job

The customer's wallet is debited and the full job amount is moved into platform escrow.

#### Release Escrow

Escrow can be released only when:

* The customer owns the job
* The job status is `customer_confirmed`
* The payment status is `escrow_funded`
* The platform escrow contains sufficient funds

When released:

```text
Escrow Amount
     ↓
     ├── 90% → Artisan Wallet
     └── 10% → Platform Balance
```

## Example Escrow Transaction

For a ₦20,000 job, suppose the customer has ₦50,000 in their wallet.

### Before Funding

```text
Customer Wallet:  ₦50,000
Platform Escrow:       ₦0
```

### After Funding

```text
Customer Wallet:  ₦30,000
Platform Escrow:  ₦20,000
```

### After Successful Escrow Release

```text
Customer Wallet:  ₦30,000
Platform Escrow:       ₦0
Artisan Wallet:   +₦18,000
Platform Balance: +₦2,000
Platform Fees:    +₦2,000
```

The financial relationship is:

```text
₦20,000
   =
₦18,000 Artisan payout
+
₦2,000 Platform fee
```

The system records the financial events as transaction records:

```text
escrow_fund
escrow_release
platform_fee
```

## Data and Financial Integrity

Financial operations involving multiple records use MongoDB/Mongoose transactions.

For example, escrow funding updates:

```text
Customer Wallet
Payment
Platform Wallet
Transaction
```

as one atomic operation.

Escrow release updates:

```text
Artisan Wallet
Platform Wallet
Payment
Transaction records
```

as one atomic operation.

If an operation fails before the transaction is committed, the related database changes are rolled back.

The Payment model uses a unique job field to prevent multiple payment records from being created for the same job.
## Testing

The core backend workflow has been tested using Postman.

The main end-to-end workflow is:

```text
Register customer
        ↓
Login
        ↓
Create job
        ↓
Artisan applies
        ↓
Customer views application
        ↓
Customer accepts application
        ↓
Job assigned
        ↓
Customer funds escrow
        ↓
Artisan starts job
        ↓
Artisan completes job
        ↓
Customer confirms job
        ↓
Escrow released
        ↓
Artisan receives payout
        ↓
Platform receives fee
```

The backend was also tested for:

* Invalid authentication tokens
* Missing authentication tokens
* Role-based access restrictions
* Job ownership checks
* Assigned-artisan authorization
* Duplicate applications
* Duplicate payments
* Duplicate escrow-release attempts
* Insufficient wallet balance
* Invalid job state transitions

## Security

The API uses:

* JWT authentication
* Password hashing
* Role-based authorization
* Resource ownership checks
* Protected routes
* Unique database indexes
* MongoDB transactions for financial operations

Sensitive environment variables such as `JWT_SECRET` and the MongoDB connection string are stored in `.env` and excluded from Git.

## Important Limitation

The wallet and escrow functionality is an internal simulated payment system for this project.

It is not connected to a real payment provider or banking network.

Wallet funding is used to simulate available customer funds during development and testing.

A production payment implementation would require additional controls such as:

* Real payment gateway integration
* Stronger financial ledger architecture
* Concurrency controls
* Audit logging
* Monitoring and alerting
* Rate limiting
* More extensive automated testing
* Additional financial security controls

## Future Improvements

Possible future improvements include:

* React frontend integration
* Real payment gateway integration
* Notifications
* Improved artisan search and matching
* Admin dashboard
* Real-time updates
* Automated test suite
* Swagger/OpenAPI documentation

## Author

**Godwin Ukpabi**

Backend Developer

### Technologies

Node.js • Express.js • MongoDB • Mongoose • JWT • bcrypt
