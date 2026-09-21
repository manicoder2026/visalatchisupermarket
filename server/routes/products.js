// server/routes/products.js
// Public, read-only product & category routes (no login required)

const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');

router.get('/products', productsController.getProducts);
router.get('/products/brands', productsController.getBrands);
router.get('/products/search', productsController.searchProducts);
router.get('/products/category/:category', productsController.getProductsByCategory);
router.get('/products/:id', productsController.getProductById);
router.get('/categories', productsController.getCategories);

module.exports = router;
