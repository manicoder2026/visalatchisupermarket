// database/build-catalog.js
// -----------------------------------------------------------------
// Generates database/categorized-catalog.csv from uploaded store data
// and populates/syncs all 9,309 products into database/visalatchi.db.
// -----------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { autoCategorize, CATEGORY_ICONS } = require('../server/controllers/importController');

const sourceCsv = path.join(__dirname, '..', 'uploads', 'import-1789628510578.csv');
const targetCsv = path.join(__dirname, 'categorized-catalog.csv');

function parseCsv(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const records = [];
    let headers = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row = [];
        let inQuotes = false;
        let curr = '';

        for (let j = 0; j < line.length; j++) {
            const c = line[j];
            if (c === '"') {
                inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) {
                row.push(curr.trim());
                curr = '';
            } else {
                curr += c;
            }
        }
        row.push(curr.trim());

        if (!headers) {
            headers = row.map(h => h.toLowerCase());
        } else {
            const obj = {};
            headers.forEach((h, idx) => {
                obj[h] = row[idx] !== undefined ? row[idx] : '';
            });
            records.push(obj);
        }
    }
    return records;
}

function run() {
    console.log('Reading source CSV:', sourceCsv);
    if (!fs.existsSync(sourceCsv)) {
        console.error('Source CSV not found:', sourceCsv);
        process.exit(1);
    }

    const content = fs.readFileSync(sourceCsv, 'utf8');
    const records = parseCsv(content);
    console.log(`Parsed ${records.length} records.`);

    // Prepare CSV output lines
    const csvLines = ['product_code,product_name,category,MRP,price,image'];
    const categorizedProducts = [];
    const categoryStats = {};

    for (const row of records) {
        const productCode = (row.product_code || row.code || '').trim();
        const productName = (row.product_name || row.name || '').trim();
        if (!productCode || !productName) continue;

        const category = autoCategorize(productName);
        categoryStats[category] = (categoryStats[category] || 0) + 1;

        const rawPrice = parseFloat(row.price);
        const rawOffer = parseFloat(row.offer_price);

        let mrp = 0;
        let sellingPrice = 0;

        if (!isNaN(rawPrice) && rawPrice > 0) {
            mrp = rawPrice;
            sellingPrice = (!isNaN(rawOffer) && rawOffer > 0 && rawOffer < rawPrice) ? rawOffer : rawPrice;
        } else if (!isNaN(rawOffer) && rawOffer > 0) {
            mrp = rawOffer;
            sellingPrice = rawOffer;
        } else {
            mrp = 10;
            sellingPrice = 10;
        }

        const rawStock = parseInt(row.stock, 10);
        // Ensure healthy storefront stock (clamp negative/zero POS ledger offsets to 100)
        const stock = (!isNaN(rawStock) && rawStock > 0) ? rawStock : 100;
        const unit = (row.unit || '1 unit').trim() || '1 unit';
        const brand = (row.brand || '').trim() || null;
        const image = (row.image || '').trim();

        // Escape CSV field if it contains commas or quotes
        const safeName = productName.includes(',') || productName.includes('"')
            ? `"${productName.replace(/"/g, '""')}"`
            : productName;

        csvLines.push(`${productCode},${safeName},${category},${mrp},${sellingPrice},${image}`);

        categorizedProducts.push({
            product_code: productCode,
            product_name: productName,
            category: category,
            brand: brand,
            price: mrp,
            offer_price: sellingPrice < mrp ? sellingPrice : null,
            stock: stock,
            unit: unit,
            image: image || null
        });
    }

    // Write database/categorized-catalog.csv
    fs.writeFileSync(targetCsv, csvLines.join('\n'), 'utf8');
    console.log(`Saved ${categorizedProducts.length} products to ${targetCsv}`);

    // Insert or update SQLite products in database/visalatchi.db
    console.log('Updating database/visalatchi.db...');

    const upsertProduct = db.prepare(`
        INSERT INTO products (
            product_code, product_name, category, brand,
            price, offer_price, stock, unit, image, status, updated_at
        ) VALUES (
            @product_code, @product_name, @category, @brand,
            @price, @offer_price, @stock, @unit, @image, 'active', CURRENT_TIMESTAMP
        )
        ON CONFLICT(product_code) DO UPDATE SET
            product_name = excluded.product_name,
            category = excluded.category,
            brand = COALESCE(excluded.brand, products.brand),
            price = excluded.price,
            offer_price = excluded.offer_price,
            stock = excluded.stock,
            unit = excluded.unit,
            image = COALESCE(products.image, excluded.image),
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
    `);

    const insertMany = db.transaction((items) => {
        for (const item of items) {
            upsertProduct.run(item);
        }
    });

    const startTime = Date.now();
    insertMany(categorizedProducts);
    const duration = Date.now() - startTime;
    console.log(`Database populated in ${duration}ms!`);

    console.log('\n--- Final Category Breakdown ---');
    for (const [cat, count] of Object.entries(categoryStats).sort((a,b) => b[1] - a[1])) {
        const icon = CATEGORY_ICONS[cat] || '🛒';
        console.log(`${icon} ${cat.padEnd(22)}: ${count} products`);
    }

    const totalInDb = db.prepare('SELECT count(*) as total FROM products').get().total;
    console.log(`\nTotal products in database: ${totalInDb}`);
}

run();
