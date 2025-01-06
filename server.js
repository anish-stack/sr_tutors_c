const express = require("express");
const dotenv = require("dotenv");
const redis = require("redis");
const cookieParser = require("cookie-parser");
const connectDb = require("./config/db");
const router = require("./routes/routes");
const setupBullBoard = require('./bullBoard');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// Redis client setup
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

(async () => {
    redisClient.on("error", (err) => {
        console.log("Redis Error:", err);
    });

    redisClient.on("ready", () => console.log("Redis is ready"));

    try {
        await redisClient.connect();
        await redisClient.ping();
        app.locals.redis = redisClient;
    } catch (err) {
        console.log("Redis Connection Error:", err);
    }
})();

// Custom CORS middleware
app.use((req, res, next) => {
    // Allowed origins for CORS
    const ALLOWED_ORIGINS = [
        "http://localhost:3001",
        "http://localhost:5173",
        "https://olyox.com",
        "https://admin.olyox.com",
        "https://www.olyox.com",
        "http://www.admin.olyox"
    ];

    const origin = req.headers.origin;

    // Check if the origin is allowed
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // Allow credentials and specify methods
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );

    // Allow all necessary headers
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Access-Control-Allow-Credentials, Access-Control-Allow-Methods'
    );

    // Security headers
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Preflight request handling
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Max-Age', '600'); // Cache preflight response for 10 minutes
        return res.status(204).end();
    }

    next();
});

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Connect to database
connectDb();

// Default route
app.get("/", (req, res) => {
    res.send("Hello World! I am from Olyox!");
});

// Flush Redis cache route
app.get("/Flush-all-Redis-Cached", async (req, res) => {
    try {
        const redisClient = req.app.locals.redis;

        if (!redisClient) {
            return res.status(500).json({
                success: false,
                message: "Redis client is not available.",
            });
        }

        await redisClient.flushAll(); // Flush all Redis data
        res.redirect("/");
    } catch (err) {
        console.log("Error in flushing Redis cache:", err);
        res.status(500).json({
            success: false,
            message: "An error occurred while clearing the Redis cache.",
            error: err.message,
        });
    }
});

// Admin login route
app.post('/admin-login', (req, res) => {
    const { email, password } = req.body;
    const defaultEmail = process.env.ADMIN_EMAIL || "admin@gmail.com";
    const defaultPassword = process.env.ADMIN_PASSWORD || "olyox@admin";

    if (email === defaultEmail && password === defaultPassword) {
        res.json({ message: 'Login successful', login: true });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Main routes
app.use("/api/v1", router);

// Error handling middleware
app.use((err, req, res, next) => {
    if (err.name === 'ValidationError') {
        for (const field in err.errors) {
            console.log(`Validation Error on field '${field}': ${err.errors[field].message}`);
        }
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: err.errors,
        });
    }

    if (!res.headersSent) {
        res.status(500).send("Something went wrong!");
    }
});

// Setup Bull Board
setupBullBoard(app);

// Start the server
app.listen(PORT, () => {
    console.log(`Bull Board available at http://localhost:${PORT}/admin/queues`);
    console.log(`Server is running on port ${PORT}`);
});
