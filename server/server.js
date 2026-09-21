// server/server.js
// -----------------------------------------------------------------
// VISALATCHI SUPER MARKET - main server entry point
// Run with: npm start   (or "npm run dev" for auto-reload)
// -----------------------------------------------------------------

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// This also creates the database tables automatically on first run
require('./db');

const { ensureDefaultAdmin } = require('./controllers/authController');

const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the frontend (HTML/CSS/JS/images) from /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- API routes ----------
app.use('/api', productsRoutes);
app.use('/api', ordersRoutes);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);

// Simple health check, useful when deploying
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Visalatchi Super Market API is running.' });
});

// ---------- Friendly fallback for unknown API routes ----------
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'This API route does not exist.' });
});

// ---------- Global error handler (e.g. multer file-size errors) ----------
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: err.message || 'Something went wrong. Please try again.' });
});

// Make sure a default admin account exists so the dashboard can always be reached
ensureDefaultAdmin();

app.listen(PORT, () => {
    console.log('===================================================');
    console.log('  VISALATCHI SUPER MARKET server is running');
    console.log(`  Website:        http://localhost:${PORT}`);
    console.log(`  Admin login:    http://localhost:${PORT}/admin.html`);
    console.log('===================================================');
});
