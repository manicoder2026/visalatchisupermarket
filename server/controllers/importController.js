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

const REQUIRED_COLUMNS = ['product_code', 'product_name', 'category', 'price'];

// POST /api/admin/import
function importProducts(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: 'Please choose a CSV file to upload.' });
    }

    const filePath = req.file.path;

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');

        let records;
        try {
            records = parse(fileContent, {
                columns: true,       // use first row as column names
                skip_empty_lines: true,
                trim: true
            });
        } catch (parseErr) {
            return res.status(400).json({ error: 'This file could not be read as CSV. Please check the file format.' });
        }

        if (records.length === 0) {
            return res.status(400).json({ error: 'The file is empty. Please add product rows and try again.' });
        }

        // Check that required columns exist in the file
        const fileColumns = Object.keys(records[0]);
        const missingColumns = REQUIRED_COLUMNS.filter(col => !fileColumns.includes(col));
        if (missingColumns.length > 0) {
            return res.status(400).json({
                error: `The CSV is missing required column(s): ${missingColumns.join(', ')}.`
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

                const productCode = (row.product_code || '').trim();
                const productName = (row.product_name || '').trim();
                const category = (row.category || '').trim();
                const priceValue = parseFloat(row.price);

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
                if (isNaN(priceValue) || priceValue <= 0) {
                    results.failed++;
                    results.errors.push(`Row ${rowNumber} (${productCode}): invalid price "${row.price}".`);
                    return;
                }

                const offerPrice = row.offer_price ? parseFloat(row.offer_price) : null;
                if (row.offer_price && isNaN(offerPrice)) {
                    results.failed++;
                    results.errors.push(`Row ${rowNumber} (${productCode}): invalid offer_price "${row.offer_price}".`);
                    return;
                }

                const stock = row.stock ? parseInt(row.stock, 10) : 0;

                // ---- Duplicate detection: update existing product instead of failing ----
                const existing = findExisting.get(productCode);

                try {
                    if (existing) {
                        updateProduct.run(
                            productName, category, row.sub_category || null, row.brand || null,
                            row.description || null, priceValue, offerPrice, stock,
                            row.unit || null, row.image || null, productCode
                        );
                        results.updated++;
                    } else {
                        insertProduct.run(
                            productCode, productName, category, row.sub_category || null, row.brand || null,
                            row.description || null, priceValue, offerPrice, stock,
                            row.unit || null, row.image || null
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

        const header = 'product_code,product_name,category,sub_category,brand,description,price,offer_price,stock,unit,image,status';
        const rows = products.map(p => [
            p.product_code, p.product_name, p.category, p.sub_category || '', p.brand || '',
            (p.description || '').replace(/,/g, ';'), p.price, p.offer_price || '', p.stock,
            p.unit || '', p.image || '', p.status
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

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
