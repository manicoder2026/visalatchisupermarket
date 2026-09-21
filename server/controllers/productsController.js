// server/controllers/productsController.js
// -----------------------------------------------------------------
// All logic for reading product data (public-facing, read-only).
// Product writes (add/edit/delete) live in adminController.js
// -----------------------------------------------------------------

const db = require('../db');

const DEFAULT_PAGE_SIZE = 24; // matches the "20-24 products per page" requirement

// GET /api/products
// Supports: page, limit, category, brand, minPrice, maxPrice, inStock, onOffer, sort
function getProducts(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 100);
        const offset = (page - 1) * limit;

        const conditions = ["status = 'active'"];
        const params = [];

        if (req.query.category) {
            conditions.push('category = ?');
            params.push(req.query.category);
        }
        if (req.query.brand) {
            conditions.push('brand = ?');
            params.push(req.query.brand);
        }
        if (req.query.minPrice) {
            conditions.push('COALESCE(offer_price, price) >= ?');
            params.push(parseFloat(req.query.minPrice));
        }
        if (req.query.maxPrice) {
            conditions.push('COALESCE(offer_price, price) <= ?');
            params.push(parseFloat(req.query.maxPrice));
        }
        if (req.query.inStock === 'true') {
            conditions.push('stock > 0');
        }
        if (req.query.onOffer === 'true') {
            conditions.push('offer_price IS NOT NULL');
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        // Sorting options
        let orderBy = 'created_at DESC'; // "Popular"/default fallback
        if (req.query.sort === 'price_low') orderBy = 'COALESCE(offer_price, price) ASC';
        if (req.query.sort === 'price_high') orderBy = 'COALESCE(offer_price, price) DESC';
        if (req.query.sort === 'new') orderBy = 'created_at DESC';
        if (req.query.sort === 'name') orderBy = 'product_name ASC';

        const countRow = db.prepare(`SELECT COUNT(*) AS total FROM products ${whereClause}`).get(...params);
        const total = countRow.total;

        const rows = db.prepare(`
            SELECT * FROM products
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        res.json({
            products: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('getProducts error:', err);
        res.status(500).json({ error: 'Could not load products right now. Please try again.' });
    }
}

// GET /api/products/:id
function getProductById(req, res) {
    try {
        const product = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'active'").get(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Sorry, this product could not be found.' });
        }

        // Related products: same category, excluding itself
        const related = db.prepare(`
            SELECT * FROM products
            WHERE category = ? AND id != ? AND status = 'active'
            LIMIT 8
        `).all(product.category, product.id);

        res.json({ product, related });
    } catch (err) {
        console.error('getProductById error:', err);
        res.status(500).json({ error: 'Could not load this product right now. Please try again.' });
    }
}

// GET /api/products/category/:category
function getProductsByCategory(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 100);
        const offset = (page - 1) * limit;
        const category = req.params.category;

        const countRow = db.prepare(`
            SELECT COUNT(*) AS total FROM products WHERE category = ? AND status = 'active'
        `).get(category);

        const rows = db.prepare(`
            SELECT * FROM products
            WHERE category = ? AND status = 'active'
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(category, limit, offset);

        res.json({
            products: rows,
            pagination: {
                page,
                limit,
                total: countRow.total,
                totalPages: Math.ceil(countRow.total / limit)
            }
        });
    } catch (err) {
        console.error('getProductsByCategory error:', err);
        res.status(500).json({ error: 'Could not load this category right now. Please try again.' });
    }
}

// GET /api/products/search?q=rice
function searchProducts(req, res) {
    try {
        const q = (req.query.q || '').trim();

        if (!q) {
            return res.json({ products: [] });
        }

        const likeTerm = `%${q}%`;

        const rows = db.prepare(`
            SELECT * FROM products
            WHERE status = 'active'
              AND (product_name LIKE ? OR brand LIKE ? OR category LIKE ? OR product_code LIKE ?)
            ORDER BY product_name ASC
            LIMIT 30
        `).all(likeTerm, likeTerm, likeTerm, likeTerm);

        res.json({ products: rows, message: rows.length ? undefined : 'No products found. Try another search.' });
    } catch (err) {
        console.error('searchProducts error:', err);
        res.status(500).json({ error: 'Search is not working right now. Please try again.' });
    }
}

// GET /api/categories
function getCategories(req, res) {
    try {
        const categories = db.prepare(`
            SELECT c.id, c.name, c.icon, c.image,
                   (SELECT COUNT(*) FROM products p WHERE p.category = c.name AND p.status = 'active') AS product_count
            FROM categories c
            ORDER BY c.display_order ASC
        `).all();

        res.json({ categories });
    } catch (err) {
        console.error('getCategories error:', err);
        res.status(500).json({ error: 'Could not load categories right now. Please try again.' });
    }
}

// GET /api/products/brands  (used to build the brand filter list)
function getBrands(req, res) {
    try {
        const rows = db.prepare(`
            SELECT DISTINCT brand FROM products
            WHERE status = 'active' AND brand IS NOT NULL AND brand != ''
            ORDER BY brand ASC
        `).all();

        res.json({ brands: rows.map(r => r.brand) });
    } catch (err) {
        console.error('getBrands error:', err);
        res.status(500).json({ error: 'Could not load brands right now.' });
    }
}

module.exports = {
    getProducts,
    getProductById,
    getProductsByCategory,
    searchProducts,
    getCategories,
    getBrands
};
