// server/controllers/authController.js
// -----------------------------------------------------------------
// Unified Authentication for Admin/Staff and Customer accounts.
// Passwords are always stored hashed with bcrypt.
// -----------------------------------------------------------------

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'visalatchi_default_jwt_secret_key_2026';

// Creates a default admin account the first time the app runs
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

// POST /api/auth/login or POST /api/admin/login
// Unified login: checks Admin first, then Customer
function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Please enter both username and password.' });
        }

        const trimmedUser = username.trim();

        // 1. Check if admin credentials match
        const admin = db.prepare('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)').get(trimmedUser);
        if (admin && bcrypt.compareSync(password, admin.password_hash)) {
            const token = jwt.sign(
                { id: admin.id, username: admin.username, role: admin.role, type: 'admin' },
                JWT_SECRET,
                { expiresIn: '12h' }
            );

            return res.json({
                message: 'Admin login successful.',
                role: 'admin',
                token,
                admin: { id: admin.id, username: admin.username, role: admin.role },
                user: { id: admin.id, username: admin.username, role: admin.role }
            });
        }

        // 2. Check if customer credentials match (can log in with username OR phone)
        const customer = db.prepare(`
            SELECT id, name, phone, username, email, password_hash 
            FROM users 
            WHERE (LOWER(username) = LOWER(?) OR phone = ?) AND password_hash IS NOT NULL
        `).get(trimmedUser, trimmedUser);

        if (customer && bcrypt.compareSync(password, customer.password_hash)) {
            const token = jwt.sign(
                { id: customer.id, username: customer.username, name: customer.name, phone: customer.phone, role: 'customer', type: 'customer' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                message: 'Login successful.',
                role: 'customer',
                token,
                admin: null,
                user: { id: customer.id, username: customer.username, name: customer.name, phone: customer.phone, email: customer.email }
            });
        }

        return res.status(401).json({ error: 'Incorrect username or password.' });
    } catch (err) {
        console.error('login error:', err);
        res.status(500).json({ error: 'Login is not working right now. Please try again.' });
    }
}

// POST /api/auth/register
// Customer sign-up for first-time visitors
function register(req, res) {
    try {
        const { name, phone, username, password, confirm_password } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Please enter your full name.' });
        }
        if (!phone || !/^\d{10}$/.test(phone.trim())) {
            return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
        }
        if (!username || !username.trim()) {
            return res.status(400).json({ error: 'Please choose a username.' });
        }
        if (!password) {
            return res.status(400).json({ error: 'Please enter a password.' });
        }
        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
        }

        const cleanUsername = username.trim();
        const cleanPhone = phone.trim();

        // Security Validation 1: Prevent username and password being the same
        if (password.trim().toLowerCase() === cleanUsername.toLowerCase()) {
            return res.status(400).json({ error: 'Password cannot be the same as your username.' });
        }

        // Security Validation 2: Ensure password confirmation matches
        if (password !== confirm_password) {
            return res.status(400).json({ error: 'Passwords do not match. Please verify your password.' });
        }

        // Security Validation 3: Avoid duplicate username across users & admins
        const userExists = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername);
        const adminExists = db.prepare('SELECT id FROM admins WHERE LOWER(username) = LOWER(?)').get(cleanUsername);
        if (userExists || adminExists) {
            return res.status(400).json({ error: 'Username already taken. Please choose another username.' });
        }

        // Security Validation 4: Avoid duplicate mobile number
        const phoneExists = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
        if (phoneExists) {
            return res.status(400).json({ error: 'This mobile number is already registered. Please sign in.' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const result = db.prepare(`
            INSERT INTO users (name, phone, username, password_hash)
            VALUES (?, ?, ?, ?)
        `).run(name.trim(), cleanPhone, cleanUsername, passwordHash);

        const newId = result.lastInsertRowid;
        const token = jwt.sign(
            { id: newId, username: cleanUsername, name: name.trim(), phone: cleanPhone, role: 'customer', type: 'customer' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Account created successfully! Welcome to Visalatchi Super Market.',
            role: 'customer',
            token,
            user: { id: newId, username: cleanUsername, name: name.trim(), phone: cleanPhone }
        });
    } catch (err) {
        console.error('register error:', err);
        res.status(500).json({ error: 'Unable to create account right now. Please try again.' });
    }
}

// GET /api/auth/me
// Returns current authenticated profile from token
function getMe(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type === 'admin') {
            const admin = db.prepare('SELECT id, username, role FROM admins WHERE id = ?').get(decoded.id);
            if (!admin) return res.status(401).json({ error: 'Admin account not found.' });
            return res.json({ role: 'admin', user: admin });
        } else {
            const customer = db.prepare('SELECT id, name, phone, username, email FROM users WHERE id = ?').get(decoded.id);
            if (!customer) return res.status(401).json({ error: 'Customer account not found.' });
            return res.json({ role: 'customer', user: customer });
        }
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session.' });
    }
}

module.exports = { login, register, getMe, ensureDefaultAdmin };
