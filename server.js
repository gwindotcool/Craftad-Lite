const http = require('http');
require('dotenv').config();


const connectDB = require('./src/config/database');
const app = require("./app");

const server = http.createServer(app);







connectDB()


    .then(() => {
        // Use the ENV port, or default to 5000 if it's missing
        const PORT = process.env.PORT || 5000;
        const ENV = process.env.NODE_ENV || 'development';


        server.listen(PORT, () => {
            console.log(`🚀 Server running in ${ENV} mode on port ${PORT}`);
        });
    })
    .catch(error => {
        console.log('❌ Failed to start server:', error.message);
        process.exit(1); // Stop the script if the DB fails
    });