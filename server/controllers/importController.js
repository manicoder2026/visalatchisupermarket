// server/controllers/importController.js
// -----------------------------------------------------------------
// Handles bulk product import from a CSV file.
// This is how the 3000-product list gets into the database:
//   1. Convert the Word document to Excel/CSV (outside this app).
//   2. Save as CSV with the columns listed below.
//   3. Upload it here from the Admin Dashboard -> Product Import screen.
//
// Expected CSV columns (header row required):
// product_code,product_name,category,brand,price,offer_price,stock,unit,image
// -----------------------------------------------------------------

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const db = require('../db');

// Helper to normalize row keys to lowercase without extra spaces
function normalizeRow(rawRow) {
    const row = {};
    for (const key of Object.keys(rawRow)) {
        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        row[cleanKey] = (rawRow[key] !== undefined && rawRow[key] !== null) ? String(rawRow[key]).trim() : '';
    }
    return row;
}

// POST /api/admin/import
function importProducts(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: 'Please choose a CSV file to upload.' });
    }

    const filePath = req.file.path;

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');

        let rawRecords;
        try {
            rawRecords = parse(fileContent, {
                columns: true,       // use first row as column names
                skip_empty_lines: true,
                trim: true
            });
        } catch (parseErr) {
            return res.status(400).json({ error: 'This file could not be read as CSV. Please check the file format.' });
        }

        if (rawRecords.length === 0) {
            return res.status(400).json({ error: 'The file is empty. Please add product rows and try again.' });
        }

        const records = rawRecords.map(normalizeRow);
        const sampleRow = records[0];

        // Check required columns: product_code, product_name, category, and (mrp OR price)
        const hasCode = 'product_code' in sampleRow || 'code' in sampleRow || 'sku' in sampleRow;
        const hasName = 'product_name' in sampleRow || 'name' in sampleRow;
        const hasCategory = 'category' in sampleRow;
        const hasPriceOrMrp = 'mrp' in sampleRow || 'price' in sampleRow;

        const missing = [];
        if (!hasCode) missing.push('product_code');
        if (!hasName) missing.push('product_name');
        if (!hasCategory) missing.push('category');
        if (!hasPriceOrMrp) missing.push('MRP or price');

        if (missing.length > 0) {
            return res.status(400).json({
                error: `The CSV is missing required column(s): ${missing.join(', ')}. Expected: product_code,product_name,category,MRP,price,image`
            });
        }

        const results = {
            totalRows: records.length,
            imported: 0,
            updated: 0,
            failed: 0,
            errors: []
        };

        const findExisting = db.prepare('SELECT id FROM products WHERE product_code = ?');

        const insertProduct = db.prepare(`
            INSERT INTO products
                (product_code, product_name, category, sub_category, brand, description,
                 price, offer_price, stock, unit, image, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `);

        const updateProduct = db.prepare(`
            UPDATE products SET
                product_name = ?, category = ?, sub_category = ?, brand = ?, description = ?,
                price = ?, offer_price = ?, stock = ?, unit = ?, image = ?, updated_at = CURRENT_TIMESTAMP
            WHERE product_code = ?
        `);

        // Process every row inside one transaction for speed with thousands of rows
        const runImport = db.transaction((rows) => {
            rows.forEach((row, index) => {
                const rowNumber = index + 2; // +2 = header row + 1-based index

                const productCode = (row.product_code || row.code || row.sku || '').trim();
                const productName = (row.product_name || row.name || '').trim();
                const category = (row.category || '').trim();

                // ---- Validation ----
                if (!productCode) {
                    results.failed++;
                    results.errors.push(`Row ${rowNumber}: missing product_code.`);
                    return;
                }
                if (!productName) {
                    results.failed++;
                    results.errors.push(`Row ${rowNumber} (${productCode}): missing product_name.`);
                    return;
                }
                if (!category) {
                    results.failed++;
                    results.errors.push(`Row ${rowNumber} (${productCode}): missing category.`);
                    return;
                }

                // ---- Price & MRP Calculation ----
                // In Indian retail CSVs:
                // MRP = Maximum Retail Price (regular price)
                // price = Selling Price (discounted/offer price)
                const rawMrp = row.mrp;
                const rawPrice = row.price;
                const rawOffer = row.offer_price;

                let finalPrice = null;
                let finalOfferPrice = null;

                const parsedMrp = (rawMrp && !isNaN(parseFloat(rawMrp))) ? parseFloat(rawMrp) : null;
                const parsedPrice = (rawPrice && !isNaN(parseFloat(rawPrice))) ? parseFloat(rawPrice) : null;
                const parsedOffer = (rawOffer && !isNaN(parseFloat(rawOffer))) ? parseFloat(rawOffer) : null;

                if (parsedMrp !== null && parsedPrice !== null) {
                    if (parsedPrice < parsedMrp) {
                        // MRP is regular price, selling price is discounted offer
                        finalPrice = parsedMrp;
                        finalOfferPrice = parsedPrice;
                    } else if (parsedPrice > parsedMrp) {
                        // User inverted columns: MRP is offer, price is original
                        finalPrice = parsedPrice;
                        finalOfferPrice = parsedMrp;
                    } else {
                        // Same price: regular price with no offer
                        finalPrice = parsedPrice;
                        finalOfferPrice = null;
                    }
                } else if (parsedMrp !== null) {
                    finalPrice = parsedMrp;
                    finalOfferPrice = parsedOffer || null;
                } else if (parsedPrice !== null) {
                    finalPrice = parsedPrice;
                    finalOfferPrice = parsedOffer || null;
                }

                if (!finalPrice || finalPrice <= 0) {
                    results.failed++;
                    results.errors.push(`Row ${rowNumber} (${productCode}): invalid price or MRP.`);
                    return;
                }

                // Default stock to 100 if omitted so imported products are available immediately
                let stock = 100;
                if (row.stock !== undefined && row.stock !== '') {
                    const parsedStock = parseInt(row.stock, 10);
                    if (!isNaN(parsedStock)) stock = parsedStock;
                }

                const unit = (row.unit || '1 unit').trim();
                const image = (row.image || '').trim() || null;
                const brand = (row.brand || '').trim() || null;
                const subCategory = (row.sub_category || row.subcategory || '').trim() || null;
                const description = (row.description || row.desc || '').trim() || null;

                // ---- Duplicate detection: update existing product instead of failing ----
                const existing = findExisting.get(productCode);

                try {
                    if (existing) {
                        updateProduct.run(
                            productName, category, subCategory, brand,
                            description, finalPrice, finalOfferPrice, stock,
                            unit, image, productCode
                        );
                        results.updated++;
                    } else {
                        insertProduct.run(
                            productCode, productName, category, subCategory, brand,
                            description, finalPrice, finalOfferPrice, stock,
                            unit, image
                        );
                        results.imported++;
                    }
                } catch (dbErr) {
                    results.failed++;
                    results.errors.push(`Row ${rowNumber} (${productCode}): ${dbErr.message}`);
                }
            });
        });

        runImport(records);

        // Clean up the uploaded temp file
        fs.unlink(filePath, () => {});

        res.json({
            message: `Import complete: ${results.imported} added, ${results.updated} updated, ${results.failed} failed.`,
            ...results
        });
    } catch (err) {
        console.error('importProducts error:', err);
        fs.unlink(filePath, () => {});
        res.status(500).json({ error: 'Import failed. Please check the file and try again.' });
    }
}

// GET /api/admin/export  - download current products as CSV
function exportProducts(req, res) {
    try {
        const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();

        const header = 'product_code,product_name,category,MRP,price,image,stock,unit,status';
        const rows = products.map(p => {
            const mrp = p.price;
            const price = p.offer_price || p.price;
            return [
                p.product_code,
                p.product_name,
                p.category,
                mrp,
                price,
                p.image || '',
                p.stock,
                p.unit || '',
                p.status
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        });

        const csv = [header, ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="visalatchi-products-export.csv"');
        res.send(csv);
    } catch (err) {
        console.error('exportProducts error:', err);
        res.status(500).json({ error: 'Could not export products right now.' });
    }
}

module.exports = { importProducts, exportProducts };
