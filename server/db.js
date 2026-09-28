// server/db.js
// -----------------------------------------------------------------
// Sets up the SQLite database connection.
// On first run, it automatically creates all tables from schema.sql.
// -----------------------------------------------------------------

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config();

// Where the database file will live (created automatically if missing)
const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', 'database', 'visalatchi.db');

// Open (or create) the database file
const db = new Database(dbFile);

// Recommended SQLite settings for a small web app
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run the schema file every time the server starts.
// "CREATE TABLE IF NOT EXISTS" makes this safe to run repeatedly.
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// Safe schema migrations for existing databases
try {
    const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
    if (!userCols.includes('username')) {
        db.exec('ALTER TABLE users ADD COLUMN username TEXT');
        db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username)');
    }
} catch (migErr) {
    console.warn('User table migration warning:', migErr.message);
}

// Ensure all 20 store categories exist in categories table
const ALL_CATEGORIES = [
    { name: 'Rice', icon: '🍚', display_order: 1 },
    { name: 'Dhall', icon: '🌾', display_order: 2 },
    { name: 'Cooking Oil', icon: '🍳', display_order: 3 },
    { name: 'Powders', icon: '🥄', display_order: 4 },
    { name: 'Beverages', icon: '☕', display_order: 5 },
    { name: 'Biscuits', icon: '🍘', display_order: 6 },
    { name: 'Cookies', icon: '🍪', display_order: 7 },
    { name: 'Chocolates', icon: '🍫', display_order: 8 },
    { name: 'Snacks', icon: '🥨', display_order: 9 },
    { name: 'Ice Cream', icon: '🍨', display_order: 10 },
    { name: 'Soaps & Liquids', icon: '🧼', display_order: 11 },
    { name: 'Shampoo', icon: '🧴', display_order: 12 },
    { name: 'Bathroom', icon: '🚿', display_order: 13 },
    { name: 'Pooja Items', icon: '🪔', display_order: 14 },
    { name: 'Baby Items', icon: '🍼', display_order: 15 },
    { name: 'Napkin', icon: '🧻', display_order: 16 },
    { name: 'Stationery', icon: '✏️', display_order: 17 },
    { name: 'Vegetables', icon: '🥬', display_order: 18 },
    { name: 'Household & Kitchen', icon: '🍽️', display_order: 19 },
    { name: 'General Groceries', icon: '🛒', display_order: 20 }
];

try {
    const insertCat = db.prepare(`
        INSERT INTO categories (name, icon, display_order)
        VALUES (?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            icon = excluded.icon,
            display_order = excluded.display_order
    `);
    const syncCats = db.transaction(() => {
        ALL_CATEGORIES.forEach(c => insertCat.run(c.name, c.icon, c.display_order));
    });
    syncCats();
} catch (catErr) {
    console.warn('Category sync warning:', catErr.message);
}

module.exports = db;
