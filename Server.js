"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");

const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { getDatabase } = require("./config/database");



const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// VILLAGECARE — PHASE 1 BACKEND
// =====================================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false
}));

// Request parsing
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({
    extended: false,
    limit: "20kb"
}));

// General API rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        error: "Too many requests. Please try again later."
    }
});

app.use("/api", apiLimiter);

// Session configuration

// =====================================================
// SESSION CONFIGURATION
// =====================================================

if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

const sessionOptions = {
    name: "villagecare.sid",

    secret: process.env.SESSION_SECRET ||
        (process.env.NODE_ENV === "production"
            ? (() => {
                throw new Error(
                    "SESSION_SECRET must be configured in production."
                );
            })()
            : "development-only-change-this-secret"),

    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60 * 1000
    }
};

// Use PostgreSQL sessions when DATABASE_URL is configured.
// Keep the default memory store for local development/tests.
if (process.env.DATABASE_URL) {
    sessionOptions.store = new pgSession({
        pool: getDatabase(),
        tableName: "user_sessions",
        createTableIfMissing: true,
        pruneSessionInterval: 15 * 60
    });

    console.log("VillageCare sessions: PostgreSQL");
} else {
    console.log("VillageCare sessions: local memory store");
}

app.use(session(sessionOptions));





// =====================================================
// JSON DATA FILES
// =====================================================

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dataFiles = [
    "users.json",
    "payments.json",
    "consultations.json"
];

for (const file of dataFiles) {
    const filePath = path.join(DATA_DIR, file);

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]\n", "utf8");
    }
}

// =====================================================
// STATIC FILES
// =====================================================

// Website: public/website/
app.use(express.static(
    path.join(__dirname, "public", "website")
));

// App testing: public/app/
app.use("/app", express.static(
    path.join(__dirname, "public", "app")
));

// =====================================================
// API ROUTES
// =====================================================


// Authentication routes
app.use("/api/auth", require("./routes/authRoutes"));

// Health check


app.get("/api/health", async (req, res) => {
    try {
        const { testDatabaseConnection } = require("./config/database");
        const database = await testDatabaseConnection();

        return res.json({
            success: true,
            service: "VillageCare",
            status: "running",
            database: "connected",
            databaseTime: database.database_time
        });
    } catch (error) {
        console.error("Database health check failed:", error.message);

        return res.status(503).json({
            success: false,
            service: "VillageCare",
            status: "running",
            database: "disconnected",
            error: "Database connection unavailable."
        });
    }
});
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        service: "VillageCare",
        status: "running",
        message: "VillageCare backend is operational."
    });
});

// Temporary triage placeholder.
// Real medical triage logic will be added separately.
app.post("/api/triage", (req, res) => {
    return res.status(501).json({
        success: false,        error: "Triage is not available yet.",
        disclaimer: "This is AI guidance only, not a doctor. Consult a health worker."
    });
});

// Payment endpoint placeholder.
// Real Flutterwave integration will be added separately.
app.post("/api/pay", (req, res) => {
    return res.status(501).json({
        success: false,
        error: "Payment processing is not configured yet."
    });
});

// Payment verification placeholder
app.get("/api/verify/:tx_ref", (req, res) => {
    return res.status(501).json({
        success: false,
        error: "Payment verification is not configured yet."
    });
});

// Not found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "The requested resource was not found."
    });
});

// Central error handler
app.use((err, req, res, next) => {
    console.error("VillageCare server error:", err.message);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        success: false,
        error: "An unexpected server error occurred."
    });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, "0.0.0.0", () => {
    console.log("--------------------------------------");
    console.log("VillageCare backend is running!");
    console.log(`Port: ${PORT}`);
    console.log(`Website: http://localhost:${PORT}`);
    console.log(`App testing: http://localhost:${PORT}/app/`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log("--------------------------------------");
});
