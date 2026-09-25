// server/routes/orders.js
const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');

router.post('/orders', ordersController.createOrder);
router.get('/orders/my-orders', ordersController.getMyOrders);
router.get('/orders/:id', ordersController.getOrderById);
router.put('/orders/:id/status', ordersController.updateOrderStatus);

module.exports = router;
