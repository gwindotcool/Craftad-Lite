const Redis = require("ioredis");

const redis = new Redis();

redis.on ( "connect", ( client ) => {
    console.log("🔥 Redis client connected")
})

redis.on("error", (err) => {
    console.error("🚨 Redis connection error:", err);
})

module.exports = redis;