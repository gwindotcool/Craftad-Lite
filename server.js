const http = require('http');
const { Server } = require('socket.io'); // Socket.IO Server
require('dotenv').config();

const connectDB = require('./src/config/database');
const app = require('./app');
const socketAuth = require('./src/middleware/socketAuth');
const registerChatHandlers = require('./src/sockets/chatSocket');

const server = http.createServer(app);

// Initialize Socket.IO instance
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
    },
});

// Apply JWT authentication to Socket.IO connections
io.use(socketAuth);

// Attach event listeners
io.on('connection', (socket) => {
    registerChatHandlers(io, socket);
});

connectDB()
    .then(() => {
        const PORT = process.env.PORT || 5000;
        const ENV = process.env.NODE_ENV || 'development';

        server.listen(PORT, () => {
            console.log(`🚀 Server running in ${ENV} mode on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.log('❌ Failed to start server:', error.message);
        process.exit(1);
    });