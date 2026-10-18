"use strict";

const express = require("express");
const session = require("express-session");
const request = require("supertest");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");

// Keep automated test accounts separate from real application accounts.
const TEST_USERS_FILE = path.join(
    os.tmpdir(),
    `villagecare-test-users-${process.pid}.json`
);

process.env.VILLAGECARE_USERS_FILE = TEST_USERS_FILE;

fs.writeFileSync(TEST_USERS_FILE, "[]", "utf8");

// IMPORTANT: Load the authentication routes only after setting the test file.
const authRoutes = require("../routes/authRoutes");

const app = express();

app.use(express.json());

app.use(session({
    name: "villagecare.test.sid",
    secret: "test-only-secret-not-for-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax"
    }
}));

app.use("/api/auth", authRoutes);

app.use((error, req, res, next) => {
    console.error(error.message);

    res.status(500).json({
        success: false,
        error: "Test server error"
    });
});

async function runTests() {
    const email =
        `villagecare-test-${Date.now()}@example.com`;

    const password = "VillageCareTest123";

    let agent;

    console.log("\nVillageCare authentication tests\n");

    // 1. A visitor cannot access the protected profile.
    const unauthorized = await request(app)
        .get("/api/auth/me");

    assert.equal(unauthorized.status, 401);
    console.log("PASS: Unauthenticated profile access is rejected.");

    // 2. Registration works.
    const registration = await request(app)
        .post("/api/auth/register")
        .send({ email, password });

    assert.equal(registration.status, 201);
    assert.equal(registration.body.success, true);
    assert.equal(registration.body.user.email, email);

    assert.equal(
        Object.hasOwn(registration.body.user, "passwordHash"),
        false
    );

    console.log("PASS: Registration succeeds without exposing the password hash.");

    // 3. Duplicate email registration is rejected.
    const duplicate = await request(app)
        .post("/api/auth/register")
        .send({ email, password });

    assert.equal(duplicate.status, 409);

    console.log("PASS: Duplicate email registration is rejected.");

    // 4. Incorrect password is rejected.
    const badLogin = await request(app)
        .post("/api/auth/login")
        .send({
            email,
            password: "WrongPassword123"
        });

    assert.equal(badLogin.status, 401);

    console.log("PASS: Incorrect login credentials are rejected.");

    // 5. Correct login creates a session.
    agent = request.agent(app);

    const login = await agent
        .post("/api/auth/login")
        .send({ email, password });

    assert.equal(login.status, 200);
    assert.equal(login.body.success, true);
    assert.ok(login.headers["set-cookie"]);

    console.log("PASS: Valid login creates a session cookie.");

    // 6. The authenticated session can access the profile.
    const profile = await agent.get("/api/auth/me");

    assert.equal(profile.status, 200);
    assert.equal(profile.body.user.email, email);

    console.log("PASS: Authenticated users can access their profile.");

    // 7. Logout destroys the session.
    const logout = await agent
        .post("/api/auth/logout");

    assert.equal(logout.status, 200);
    assert.equal(logout.body.success, true);

    const afterLogout = await agent.get("/api/auth/me");

    assert.equal(afterLogout.status, 401);

    console.log("PASS: Logout removes access to the protected profile.");

    console.log("\nAll authentication tests passed! 🎉\n");
}

runTests()
    .catch((error) => {
        console.error("\nAUTHENTICATION TEST FAILED");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => {
        try {
            if (fs.existsSync(TEST_USERS_FILE)) {
                fs.unlinkSync(TEST_USERS_FILE);
            }
        } catch (cleanupError) {
            console.error(
                "Could not remove temporary test data:",
                cleanupError.message
            );
            process.exitCode = 1;
        }
    });
