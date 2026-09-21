// server/controllers/ordersController.js
// -----------------------------------------------------------------
// Handles placing new orders, viewing an order, and updating status.
// -----------------------------------------------------------------

const db = require('../db');

// Generates an order number like "VSM100245"
function generateOrderNumber() {
    const row = db.prepare('SELECT COUNT(*) AS total FROM orders').get();
    const nextNumber = 100001 + row.total;
    return `VSM${nextNumber}`;
}

// POST /api/orders
// Expected body:
// {
//   customer_name, customer_phone, house_number, street, area, city, pincode,
//   landmark, delivery_instructions,
//   items: [{ product_id, quantity }]
// }
function createOrder(req, res) {
    try {
        const {
            customer_name, customer_phone, house_number, street, area,
            city, pincode, landmark, delivery_instructions, items
        } = req.body;

        // ---- Basic validation with friendly error messages ----
        if (!customer_name || !customer_name.trim()) {
            return res.status(400).json({ error: 'Please enter your name.' });
        }
        if (!customer_phone || !/^\d{10}$/.test(customer_phone.trim())) {
            return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
        }
        if (!street || !area || !city || !pincode) {
            return res.status(400).json({ error: 'Please complete your delivery address.' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Your cart is empty. Please add items before ordering.' });
        }

        // ---- Look up each product fresh from the database (never trust client-sent prices) ----
        const getProduct = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'active'");
        const orderItemsData = [];
        let subtotal = 0;

        for (const item of items) {
            const product = getProduct.get(item.product_id);

            if (!product) {
                return res.status(400).json({ error: `One of the items in your cart is no longer available.` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Sorry, "${product.product_name}" only has ${product.stock} left in stock.` });
            }

            const unitPrice = product.offer_price != null ? product.offer_price : product.price;
            const lineSubtotal = unitPrice * item.quantity;
            subtotal += lineSubtotal;

            orderItemsData.push({
                product_id: product.id,
                product_name: product.product_name,
                unit: product.unit,
                price: unitPrice,
                quantity: item.quantity,
                subtotal: lineSubtotal
            });
        }

        const deliveryFee = 0; // Free home delivery, always
        const total = subtotal + deliveryFee;
        const orderNumber = generateOrderNumber();

        // ---- Insert order + order items + reduce stock, all inside one transaction ----
        const insertOrder = db.prepare(`
            INSERT INTO orders
                (order_number, customer_name, customer_phone, house_number, street, area, city, pincode,
                 landmark, delivery_instructions, subtotal, delivery_fee, total, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        `);

        const insertItem = db.prepare(`
            INSERT INTO order_items (order_id, product_id, product_name, unit, price, quantity, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

        const placeOrder = db.transaction(() => {
            const result = insertOrder.run(
                orderNumber, customer_name.trim(), customer_phone.trim(),
                house_number || '', street, area, city, pincode,
                landmark || '', delivery_instructions || '',
                subtotal, deliveryFee, total
            );

            const orderId = result.lastInsertRowid;

            orderItemsData.forEach((item) => {
                insertItem.run(orderId, item.product_id, item.product_name, item.unit, item.price, item.quantity, item.subtotal);
                reduceStock.run(item.quantity, item.product_id);
            });

            return orderId;
        });

        const orderId = placeOrder();

        res.status(201).json({
            message: 'Order placed successfully!',
            order: {
                id: orderId,
                order_number: orderNumber,
                total,
                delivery_fee: deliveryFee,
                status: 'Pending'
            }
        });
    } catch (err) {
        console.error('createOrder error:', err);
        res.status(500).json({ error: "We couldn't place your order right now. Please try again." });
    }
}

// GET /api/orders/:id  (id can be numeric ID or order_number like VSM100245)
function getOrderById(req, res) {
    try {
        const idParam = req.params.id;
        const isOrderNumber = isNaN(idParam);

        const order = isOrderNumber
            ? db.prepare('SELECT * FROM orders WHERE order_number = ?').get(idParam)
            : db.prepare('SELECT * FROM orders WHERE id = ?').get(idParam);

        if (!order) {
            return res.status(404).json({ error: 'Order not found. Please check your order ID.' });
        }

        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

        res.json({ order, items });
    } catch (err) {
        console.error('getOrderById error:', err);
        res.status(500).json({ error: 'Could not load this order right now. Please try again.' });
    }
}

// PUT /api/orders/:id/status   (used by staff)
function updateOrderStatus(req, res) {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Confirmed', 'Packing', 'Out for Delivery', 'Delivered', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid order status.' });
        }

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        db.prepare(`
            UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(status, req.params.id);

        res.json({ message: `Order status updated to "${status}".` });
    } catch (err) {
        console.error('updateOrderStatus error:', err);
        res.status(500).json({ error: 'Could not update order status right now. Please try again.' });
    }
}

module.exports = { createOrder, getOrderById, updateOrderStatus };
