# Craftad Lite - Backend Infrastructure

A robust, two-sided marketplace REST API connecting artisans with customers. Features secure JWT authentication, job management, automated notifications, and a CI/CD pipeline with Redis and MongoDB integration.

## 🚀 Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Caching & Messaging:** Redis
- **Testing:** Jest & Supertest (In-memory MongoDB)
- **CI/CD:** GitHub Actions

## ⚙️ Prerequisites
Ensure you have the following installed on your local machine:
- Node.js (v18 or v20)
- MongoDB (Running locally or via Atlas)
- Redis (Running locally on default port `6379`)

## 🛠️ Environment Variables
Create a `.env` file in the root directory and add the following keys. Do NOT commit the `.env` file to version control.

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/craftad_lite
JWT_SECRET=your_super_secret_jwt_key
REDIS_URL=redis://127.0.0.1:6379
📦 Installation & Setup
Clone the repository:

Bash
git clone [https://github.com/gwindotcool/Craftad-Lite.git](https://github.com/gwindotcool/Craftad-Lite.git)
cd Craftad-Lite
Install dependencies:

Bash
npm install
Start the development server:

Bash
npm run dev
Note: This runs nodemon for auto-reloading during development.

Start the production server:

Bash
npm start

## 📂 Project Structure
```text
Craftad-Lite/
├── .github/workflows/   # CI/CD pipeline configurations
├── src/
│   ├── config/          # Database and Redis connections
│   ├── controllers/     # Business logic for requests
│   ├── middleware/      # Auth protection and validation
│   ├── models/          # Mongoose database schemas
│   ├── routes/          # API route definitions
│   └── tests/           # Jest integration tests and setup
├── app.js               # Express application setup
├── server.js            # Entry point / server boot
├── package.json         # Dependencies and scripts
└── README.md

🔌 API Endpoints Reference
Authentication (/api/auth)
POST /register - Create a new user account (Customer/Artisan)

POST /login - Authenticate user and receive JWT

Notifications (/api/notifications)
GET /api/notifications - Retrieve logged-in user's notifications (Protected)

PATCH /api/notifications/:id/read - Mark a single notification as read (Protected)

PATCH /api/notifications/read-all - Mark all notifications as read (Protected)

🧪 Testing
This project strictly enforces test-driven stability. The testing suite uses mongodb-memory-server to isolate database transactions.

Run the test suite:

Bash
npm test
🚀 CI/CD Pipeline
Every pull request and push to the main or development branches triggers a GitHub Actions workflow. The pipeline automatically:

Provisions an Ubuntu server.

Spins up a Redis service container.

Installs exact dependencies via npm ci.

Runs a high-level NPM security audit.

Executes the Jest integration test suite.
Deployment is blocked if any of these steps fail.