// server/controllers/adminController.js
// -----------------------------------------------------------------
// Everything the admin/staff dashboard needs:
// dashboard stats, product management, order management, image upload.
// -----------------------------------------------------------------

const db = require('../db');

// GET /api/admin/dashboard
function getDashboardStats(req, res) {
    try {
        const totalProducts = db.prepare("SELECT COUNT(*) AS total FROM products WHERE status = 'active'").get().total;
        const totalOrders = db.prepare('SELECT COUNT(*) AS total FROM orders').get().total;
        const pendingOrders = db.prepare("SELECT COUNT(*) AS total FROM orders WHERE status IN ('Pending','Confirmed','Packing')").get().total;

        const todayOrders = db.prepare(`
            SELECT COUNT(*) AS total FROM orders WHERE date(created_at) = date('now')
        `).get().total;

        const todaySales = db.prepare(`
            SELECT COALESCE(SUM(total), 0) AS total FROM orders
            WHERE date(created_at) = date('now') AND status != 'Cancelled'
        `).get().total;

        res.json({
            totalProducts,
            totalOrders,
            pendingOrders,
            todayOrders,
            todaySales
        });
    } catch (err) {
        console.error('getDashboardStats error:', err);
        res.status(500).json({ error: 'Could not load dashboard stats right now.' });
    }
}

// ---------------------- PRODUCT MANAGEMENT ----------------------

// GET /api/admin/products (search + pagination, includes inactive products too)
function listProductsAdmin(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const offset = (page - 1) * limit;
        const q = (req.query.q || '').trim();

        let whereClause = '';
        const params = [];

        if (q) {
            whereClause = 'WHERE product_name LIKE ? OR product_code LIKE ? OR category LIKE ?';
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        const total = db.prepare(`SELECT COUNT(*) AS total FROM products ${whereClause}`).get(...params).total;

        const rows = db.prepare(`
            SELECT * FROM products
            ${whereClause}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        res.json({ products: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        console.error('listProductsAdmin error:', err);
        res.status(500).json({ error: 'Could not load products right now.' });
    }
}

// POST /api/admin/products
function createProduct(req, res) {
    try {
        const {
            product_code, product_name, category, sub_category, brand,
            description, price, offer_price, stock, unit, status
        } = req.body;

        if (!product_code || !product_name || !category || !price) {
            return res.status(400).json({ error: 'Product code, name, category and price are required.' });
        }
        if (isNaN(price) || parseFloat(price) <= 0) {
            return res.status(400).json({ error: 'Please enter a valid price.' });
        }

        const existing = db.prepare('SELECT id FROM products WHERE product_code = ?').get(product_code.trim());
        if (existing) {
            return res.status(409).json({ error: `Product code "${product_code}" already exists.` });
        }

        const result = db.prepare(`
            INSERT INTO products
                (product_code, product_name, category, sub_category, brand, description,
                 price, offer_price, stock, unit, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            product_code.trim(), product_name.trim(), category.trim(), sub_category || null, brand || null,
            description || null, parseFloat(price), offer_price ? parseFloat(offer_price) : null,
            parseInt(stock, 10) || 0, unit || null, status || 'active'
        );

        res.status(201).json({ message: 'Product added successfully.', id: result.lastInsertRowid });
    } catch (err) {
        console.error('createProduct error:', err);
        res.status(500).json({ error: 'Could not add product right now. Please try again.' });
    }
}

// PUT /api/admin/products/:id
function updateProduct(req, res) {
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        const {
            product_name, category, sub_category, brand, description,
            price, offer_price, stock, unit, status
        } = req.body;

        db.prepare(`
            UPDATE products SET
                product_name = ?, category = ?, sub_category = ?, brand = ?, description = ?,
                price = ?, offer_price = ?, stock = ?, unit = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            product_name ?? product.product_name,
            category ?? product.category,
            sub_category ?? product.sub_category,
            brand ?? product.brand,
            description ?? product.description,
            price != null ? parseFloat(price) : product.price,
            offer_price !== undefined ? (offer_price ? parseFloat(offer_price) : null) : product.offer_price,
            stock != null ? parseInt(stock, 10) : product.stock,
            unit ?? product.unit,
            status ?? product.status,
            req.params.id
        );

        res.json({ message: 'Product updated successfully.' });
    } catch (err) {
        console.error('updateProduct error:', err);
        res.status(500).json({ error: 'Could not update product right now. Please try again.' });
    }
}

// DELETE /api/admin/products/:id
// (soft delete - marks inactive, so past orders still show correct history)
function deleteProduct(req, res) {
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        db.prepare("UPDATE products SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

        res.json({ message: 'Product removed successfully.' });
    } catch (err) {
        console.error('deleteProduct error:', err);
        res.status(500).json({ error: 'Could not remove product right now. Please try again.' });
    }
}

// POST /api/admin/products/:id/image  (multer middleware handles the actual file save)
function uploadProductImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please choose an image file (JPG, PNG or WEBP).' });
        }

        const imagePath = `/images/products/${req.file.filename}`;

        db.prepare('UPDATE products SET image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(imagePath, req.params.id);

        res.json({ message: 'Image uploaded successfully.', image: imagePath });
    } catch (err) {
        console.error('uploadProductImage error:', err);
        res.status(500).json({ error: 'Could not upload image right now. Please try again.' });
    }
}

// PUT /api/admin/products/bulk/price   { category, percent } or { productIds: [], newPrice }
function bulkUpdatePrice(req, res) {
    try {
        const { category, percentChange } = req.body;

        if (!category || percentChange == null) {
            return res.status(400).json({ error: 'Please provide a category and percentage change.' });
        }

        const multiplier = 1 + (parseFloat(percentChange) / 100);

        const result = db.prepare(`
            UPDATE products
            SET price = ROUND(price * ?, 2), updated_at = CURRENT_TIMESTAMP
            WHERE category = ?
        `).run(multiplier, category);

        res.json({ message: `Prices updated for ${result.changes} products in "${category}".` });
    } catch (err) {
        console.error('bulkUpdatePrice error:', err);
        res.status(500).json({ error: 'Could not update prices right now.' });
    }
}

// PUT /api/admin/products/bulk/stock   { productId, stock } for each row, sent as an array
function bulkUpdateStock(req, res) {
    try {
        const { updates } = req.body; // [{ id, stock }, ...]

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'No stock updates provided.' });
        }

        const stmt = db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const runAll = db.transaction((rows) => {
            rows.forEach(row => stmt.run(row.stock, row.id));
        });

        runAll(updates);

        res.json({ message: `Stock updated for ${updates.length} products.` });
    } catch (err) {
        console.error('bulkUpdateStock error:', err);
        res.status(500).json({ error: 'Could not update stock right now.' });
    }
}

// ---------------------- ORDER MANAGEMENT ----------------------

// GET /api/admin/orders?status=Pending
function listOrders(req, res) {
    try {
        const status = req.query.status;

        const whereClause = status ? 'WHERE status = ?' : '';
        const params = status ? [status] : [];

        const orders = db.prepare(`
            SELECT * FROM orders
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT 200
        `).all(...params);

        res.json({ orders });
    } catch (err) {
        console.error('listOrders error:', err);
        res.status(500).json({ error: 'Could not load orders right now.' });
    }
}

// GET /api/admin/orders/:id  (full detail for the staff packing screen)
function getOrderDetail(req, res) {
    try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

        res.json({ order, items });
    } catch (err) {
        console.error('getOrderDetail error:', err);
        res.status(500).json({ error: 'Could not load this order right now.' });
    }
}

// PUT /api/admin/orders/:id/items/:itemId/pack  (toggle packed checkbox on staff screen)
function toggleItemPacked(req, res) {
    try {
        const { is_packed } = req.body;
        db.prepare('UPDATE order_items SET is_packed = ? WHERE id = ? AND order_id = ?')
          .run(is_packed ? 1 : 0, req.params.itemId, req.params.id);

        res.json({ message: 'Updated.' });
    } catch (err) {
        console.error('toggleItemPacked error:', err);
        res.status(500).json({ error: 'Could not update this item right now.' });
    }
}

module.exports = {
    getDashboardStats,
    listProductsAdmin,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    bulkUpdatePrice,
    bulkUpdateStock,
    listOrders,
    getOrderDetail,
    toggleItemPacked
};
