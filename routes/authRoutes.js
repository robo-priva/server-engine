"use strict";

const express = require("express");
const {
    registerUser,
    authenticateUser
} = require("../services/accountService");

const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.post("/register", async (req, res, next) => {
    try {
        const result = await registerUser(req.body);

        if (!result.success) {
            return res.status(result.status).json(result);
        }

        return res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

router.post("/login", async (req, res, next) => {
    try {
        const user = await authenticateUser(req.body);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password."
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                return next(error);
            }

            req.session.user = user;

            req.session.save((saveError) => {
                if (saveError) {
                    return next(saveError);
                }

                return res.json({
                    success: true,
                    user
                });
            });
        });
    } catch (error) {
        next(error);
    }
});

router.get("/me", requireAuth, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

router.post("/logout", (req, res, next) => {
    if (!req.session) {
        return res.json({ success: true });
    }

    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie("villagecare.sid", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });

        return res.json({ success: true });
    });
});

module.exports = router;
