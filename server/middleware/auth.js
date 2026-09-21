// server/middleware/auth.js
// -----------------------------------------------------------------
// Protects admin-only routes. The admin dashboard sends the token
// it received at login in the "Authorization: Bearer <token>" header.
// -----------------------------------------------------------------

const jwt = require('jsonwebtoken');
require('dotenv').config();

function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Login required. Please sign in as admin.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded; // { id, username, role }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }
}

module.exports = { requireAdmin };
