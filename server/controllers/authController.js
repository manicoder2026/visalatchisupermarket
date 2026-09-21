// server/controllers/authController.js
// -----------------------------------------------------------------
// Admin/staff login. Passwords are always stored hashed (bcrypt),
// never in plain text.
// -----------------------------------------------------------------

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

// Creates a default admin account the first time the app runs,
// so there's always a way to log in. Uses DEFAULT_ADMIN_USERNAME /
// DEFAULT_ADMIN_PASSWORD from .env - change these in production!
function ensureDefaultAdmin() {
    const existing = db.prepare('SELECT COUNT(*) AS total FROM admins').get();

    if (existing.total === 0) {
        const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
        const passwordHash = bcrypt.hashSync(password, 10);

        db.prepare(`
            INSERT INTO admins (username, password_hash, role) VALUES (?, ?, 'admin')
        `).run(username, passwordHash);

        console.log(`Default admin account created -> username: "${username}" (see .env for password)`);
        console.log('IMPORTANT: Change this password after your first login.');
    }
}

// POST /api/admin/login
function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Please enter both username and password.' });
        }

        const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username.trim());

        if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
            return res.status(401).json({ error: 'Incorrect username or password.' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET || 'visalatchi_default_jwt_secret_key_2026',
            { expiresIn: '12h' }
        );

        res.json({
            message: 'Login successful.',
            token,
            admin: { id: admin.id, username: admin.username, role: admin.role }
        });
    } catch (err) {
        console.error('login error:', err);
        res.status(500).json({ error: 'Login is not working right now. Please try again.' });
    }
}

module.exports = { login, ensureDefaultAdmin };
