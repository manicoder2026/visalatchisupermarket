// server/routes/orders.js
// Order placement & tracking (guest checkout friendly - no login required)

const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');

router.post('/orders', ordersController.createOrder);
router.get('/orders/:id', ordersController.getOrderById);
router.put('/orders/:id/status', ordersController.updateOrderStatus); // staff use, ideally protect further in production

module.exports = router;
