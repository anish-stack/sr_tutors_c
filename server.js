const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 5000;
const app = express();
const redis = require("redis");
const connectDb = require("./config/db");
const router = require("./routes/routes");
const setupBullBoard = require('./bullBoard');

// Redis client setup
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

(async () => {
    redisClient.on("error", (err) => {
        console.log(err);
    });

    redisClient.on("ready", () => console.log("Redis is ready"));

    try {
        await redisClient.connect();
        await redisClient.ping();
        app.locals.redis = redisClient;
    } catch (err) {
        console.log(err);
    }
})();

// Middleware for custom headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});

// Middleware and routes setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Connect to database
connectDb();

// Routes
app.get("/", (req, res) => {
    res.send("Hello World I am From Olyox !");
});

app.get("/Flush-all-Redis-Cached", async (req, res) => {
    try {
        const redisClient = req.app.locals.redis;

        if (!redisClient) {
            return res.status(500).json({
                success: false,
                message: "Redis client is not available.",
            });
        }

        await redisClient.flushAll(); // Flush all the Redis data
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

app.use("/api/v1", router);

app.post('/admin-login', (req, res) => {
    console.log(req.body);
    const { email, password } = req.body;
    const defaultEmail = process.env.ADMIN_EMAIL || "admin@gmail.com";
    const defaultPassword = process.env.ADMIN_PASSWORD || "olyox@admin";

    console.log(defaultEmail);
    if (email === defaultEmail && password === defaultPassword) {
        res.json({ message: 'Login successful', login: true });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

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

// Setup Bull Board (keep this part as is)
setupBullBoard(app);

// Start the server without clustering
app.listen(PORT, () => {
    console.log(`Bull Board available at http://localhost:${PORT}/admin/queues`);
    console.log('Server is running on port', PORT);
});
