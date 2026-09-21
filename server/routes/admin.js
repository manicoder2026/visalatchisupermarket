// server/routes/admin.js
// All routes here require a valid admin login token (see middleware/auth.js)

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const importController = require('../controllers/importController');
const { requireAdmin } = require('../middleware/auth');
const { uploadImage, uploadCsv } = require('../middleware/upload');

// Every route below requires admin login
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Product management
router.get('/products', adminController.listProductsAdmin);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/products/:id/image', uploadImage.single('image'), adminController.uploadProductImage);

// Bulk product management
router.put('/products/bulk/price', adminController.bulkUpdatePrice);
router.put('/products/bulk/stock', adminController.bulkUpdateStock);
router.post('/import', uploadCsv.single('file'), importController.importProducts);
router.get('/export', importController.exportProducts);

// Order management
router.get('/orders', adminController.listOrders);
router.get('/orders/:id', adminController.getOrderDetail);
router.put('/orders/:id/items/:itemId/pack', adminController.toggleItemPacked);

module.exports = router;
