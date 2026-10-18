"use strict";

function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            error: "Please log in to access this feature."
        });
    }

    req.user = {
        id: req.session.user.id,
        email: req.session.user.email
    };

    next();
}

module.exports = requireAuth;
