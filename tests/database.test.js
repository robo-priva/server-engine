"use strict";

require("dotenv").config();

const { testDatabaseConnection } = require("../config/database");

async function main() {
    try {
        const result = await testDatabaseConnection();

        console.log("✅ PostgreSQL connection successful.");
        console.log("Database server time:", result.database_time);
        process.exitCode = 0;
    } catch (error) {
        console.error("❌ PostgreSQL connection failed.");
        console.error(error.message);
        process.exitCode = 1;
    }
}

main();
