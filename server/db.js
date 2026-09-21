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

module.exports = db;
