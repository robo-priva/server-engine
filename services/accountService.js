"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const USERS_FILE = process.env.VILLAGECARE_USERS_FILE
    ? path.resolve(process.env.VILLAGECARE_USERS_FILE)
    : path.join(__dirname, "..", "data", "users.json");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCRYPT_KEY_LENGTH = 64;

async function readUsers() {
    let content;

    try {
        content = await fs.readFile(USERS_FILE, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") {
            await fs.mkdir(path.dirname(USERS_FILE), {
                recursive: true
            });

            await fs.writeFile(USERS_FILE, "[]\n", {
                flag: "wx"
            }).catch((writeError) => {
                if (writeError.code !== "EEXIST") {
                    throw writeError;
                }
            });

            content = await fs.readFile(USERS_FILE, "utf8");
        } else {
            throw error;
        }
    }

    const users = JSON.parse(content);

    if (!Array.isArray(users)) {
        throw new Error("The user data file has an invalid format.");
    }

    return users;
}

async function writeUsers(users) {
    const temporaryFile =
        USERS_FILE + "." + crypto.randomUUID() + ".tmp";

    try {
        await fs.writeFile(
            temporaryFile,
            JSON.stringify(users, null, 2) + "\n",
            {
                encoding: "utf8",
                mode: 0o600,
                flag: "wx"
            }
        );

        await fs.rename(temporaryFile, USERS_FILE);
    } finally {
        await fs.rm(temporaryFile, { force: true }).catch(() => {});
    }
}

function validateRegistration(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return "Please submit valid registration details.";
    }

    if (typeof input.email !== "string") {
        return "Please enter a valid email address.";
    }

    const email = input.email.trim().toLowerCase();

    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
        return "Please enter a valid email address.";
    }

    if (typeof input.password !== "string") {
        return "Please enter a password.";
    }

    const password = input.password;

    if (password.length < 10 || password.length > 128) {
        return "Your password must contain between 10 and 128 characters.";
    }

    if (Buffer.byteLength(password, "utf8") > 128) {
        return "Your password is too long.";
    }

    if (
        !/[a-z]/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password)
    ) {
        return "Use at least one uppercase letter, one lowercase letter, and one number.";
    }

    return null;
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH, {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024
    });

    return [
        "scrypt",
        salt.toString("hex"),
        derivedKey.toString("hex")
    ].join("$");
}

async function verifyPassword(password, storedHash) {
    if (typeof storedHash !== "string") {
        return false;
    }

    const parts = storedHash.split("$");

    if (
        parts.length !== 3 ||
        parts[0] !== "scrypt" ||
        !/^[a-f0-9]{32}$/i.test(parts[1]) ||
        !/^[a-f0-9]{128}$/i.test(parts[2])
    ) {
        return false;
    }

    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");

    const actual = await scrypt(password, salt, expected.length, {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024
    });

    return crypto.timingSafeEqual(expected, actual);
}

async function registerUser(input) {
    const validationError = validateRegistration(input);

    if (validationError) {
        return {
            success: false,
            status: 400,
            error: validationError
        };
    }

    const email = input.email.trim().toLowerCase();
    const users = await readUsers();

    if (users.some((user) => user.email === email)) {
        return {
            success: false,
            status: 409,
            error: "An account with this email address already exists."
        };
    }

    const passwordHash = await hashPassword(input.password);

    const user = {
        id: crypto.randomUUID(),
        email,
        passwordHash,
        createdAt: new Date().toISOString(),
        status: "active"
    };

    users.push(user);
    await writeUsers(users);

    return {
        success: true,
        user: {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt
        }
    };
}

async function authenticateUser(input) {
    if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        typeof input.email !== "string" ||
        typeof input.password !== "string" ||
        input.email.length > 254 ||
        input.password.length > 128
    ) {
        return null;
    }

    const email = input.email.trim().toLowerCase();
    const users = await readUsers();

    const user = users.find((item) => item.email === email);

    if (!user || user.status !== "active") {
        return null;
    }

    const passwordMatches = await verifyPassword(
        input.password,
        user.passwordHash
    );

    if (!passwordMatches) {
        return null;
    }

    return {
        id: user.id,
        email: user.email
    };
}

module.exports = {
    validateRegistration,
    registerUser,
    authenticateUser
};
