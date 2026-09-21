-- =========================================================
-- VISALATCHI SUPER MARKET - DATABASE SCHEMA
-- Engine: SQLite (works the same way conceptually in MySQL,
-- with only minor syntax differences noted in comments)
-- =========================================================

-- ---------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL UNIQUE,
    icon          TEXT,               -- emoji or image path shown on category card
    image         TEXT,               -- category banner/image path
    display_order INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- PRODUCTS  (designed to comfortably hold 3000+ rows)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code  TEXT NOT NULL UNIQUE,     -- unique SKU, used for duplicate detection on import
    product_name  TEXT NOT NULL,
    category      TEXT NOT NULL,
    sub_category  TEXT,
    brand         TEXT,
    description   TEXT,
    price         REAL NOT NULL,            -- MRP / regular price
    offer_price   REAL,                     -- discounted price, NULL if no offer
    stock         INTEGER NOT NULL DEFAULT 0,
    unit          TEXT,                     -- e.g. "1 kg", "500 ml", "1 pc"
    image         TEXT,                     -- path under /public/images/products/
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes to keep search/filtering fast even with thousands of products
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products (brand);
CREATE INDEX IF NOT EXISTS idx_products_name     ON products (product_name);
CREATE INDEX IF NOT EXISTS idx_products_status   ON products (status);

-- ---------------------------------------------------------
-- USERS (optional customer accounts - guest checkout is also supported)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    phone         TEXT NOT NULL UNIQUE,
    email         TEXT,
    password_hash TEXT,                     -- NULL for guest-only customers
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- ADMINS / STAFF LOGIN
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number          TEXT NOT NULL UNIQUE,   -- e.g. VSM100245
    user_id               INTEGER,                -- NULL for guest orders
    customer_name         TEXT NOT NULL,
    customer_phone        TEXT NOT NULL,
    house_number          TEXT,
    street                TEXT,
    area                  TEXT,
    city                  TEXT,
    pincode               TEXT,
    landmark              TEXT,
    delivery_instructions TEXT,
    subtotal              REAL NOT NULL,
    delivery_fee          REAL NOT NULL DEFAULT 0,   -- always 0, delivery is free
    total                 REAL NOT NULL,
    status                TEXT NOT NULL DEFAULT 'Pending'
                          CHECK (status IN ('Pending','Confirmed','Packing','Out for Delivery','Delivered','Cancelled')),
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_phone  ON orders (customer_phone);

-- ---------------------------------------------------------
-- ORDER ITEMS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL,
    product_id   INTEGER NOT NULL,
    product_name TEXT NOT NULL,     -- snapshot, in case product is edited/deleted later
    unit         TEXT,
    price        REAL NOT NULL,     -- price paid per unit at time of order
    quantity     INTEGER NOT NULL,
    subtotal     REAL NOT NULL,
    is_packed    INTEGER NOT NULL DEFAULT 0,  -- used by staff packing checklist (0/1)
    FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- ---------------------------------------------------------
-- CART (for logged-in users; guests use browser localStorage instead)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id),
    UNIQUE (user_id, product_id)
);

-- ---------------------------------------------------------
-- WISHLIST
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlist (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id),
    UNIQUE (user_id, product_id)
);

-- =========================================================
-- NOTES FOR MYSQL USERS
-- If you prefer MySQL instead of SQLite, the same structure
-- works with these small changes:
--   INTEGER PRIMARY KEY AUTOINCREMENT  ->  INT AUTO_INCREMENT PRIMARY KEY
--   DATETIME DEFAULT CURRENT_TIMESTAMP ->  same, supported in MySQL 5.6+
--   CHECK (...) constraints            ->  supported in MySQL 8.0.16+
-- =========================================================
