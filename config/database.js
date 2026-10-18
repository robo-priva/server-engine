"use strict";

const { Pool } = require("pg");

let pool = null;

function getDatabase() {
    if (pool) {
        return pool;
    }

    if (!process.env.DATABASE_URL) {
        throw new Error(
            "DATABASE_URL is missing. Configure the PostgreSQL connection."
        );
    }

    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === "true"
            ? { rejectUnauthorized: true }
            : undefined,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });

    pool.on("error", (error) => {
        console.error(
            "Unexpected PostgreSQL connection error:",
            error.message
        );
    });

    return pool;
}

async function testDatabaseConnection() {
    const db = getDatabase();

    const result = await db.query(
        "SELECT NOW() AS database_time"
    );

    return result.rows[0];
}

module.exports = {
    getDatabase,
    testDatabaseConnection
};
