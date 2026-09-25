// server/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Unified login for Admin and Customer
router.post('/login', authController.login);
router.post('/admin/login', authController.login); // backward-compatibility

// Customer registration
router.post('/register', authController.register);

// Profile check
router.get('/me', authController.getMe);

module.exports = router;
