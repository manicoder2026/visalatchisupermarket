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

// Category icons lookup
const CATEGORY_ICONS = {
    'Rice': '🍚',
    'Dhall': '🌾',
    'Cooking Oil': '🍳',
    'Powders': '🥄',
    'Beverages': '☕',
    'Biscuits': '🍘',
    'Cookies': '🍪',
    'Chocolates': '🍫',
    'Snacks': '🥨',
    'Ice Cream': '🍨',
    'Soaps & Liquids': '🧼',
    'Shampoo': '🧴',
    'Bathroom': '🚿',
    'Pooja Items': '🪔',
    'Baby Items': '🍼',
    'Napkin': '🧻',
    'Stationery': '✏️',
    'Vegetables': '🥬',
    'Household & Kitchen': '🍽️',
    'General Groceries': '🛒'
};

function getCategoryIcon(cat) {
    return CATEGORY_ICONS[cat] || '🛒';
}

function autoCategorize(name) {
    if (!name) return 'General Groceries';
    const n = name.toUpperCase();

    // 1. Pooja Items
    if (/AGARBATHI|AGARBATTI|INCENSE|DHOOP|CAMPHOR|KARPOORAM|VIBHUDHI|VIBUDHI|KUMKUM|KUNGUMAM|SANDAL TABLET|CHANDAN|DEEPAM|POOJA|PUJA|SAMBRANI|DIYA|THIRI|HOMAM|KAYIRU|THAALI|MANJAL KAIRU|ARTHI|POOJA OIL|DHOOP CONE|MEHANDI|MEHNDI|HENNA|\bCYCLE\b|AMBICA|MANGALDEEP|VASU BAPUNA|OMAM WATER|VILAKKU|VILAKU|AGAL/.test(n)) {
        return 'Pooja Items';
    }

    // 2. Baby Items
    if (/BABY|DIAPER|PAMPERS|HUGGIES|MAMYPOKO|MAMY POKO|JOHNSON.*BABY|CERELAC|NESTUM|LACTOGEN|FEEDING BOTTLE|NIPPLE|GRIPE WATER|BONNISAN|WOODWARD/.test(n)) {
        return 'Baby Items';
    }

    // 3. Napkins & Sanitary Pads
    if (/NAPKIN|WHISPER|STAYFREE|SOFY|KOTEX|SANITARY PAD|PANTYLINER/.test(n)) {
        return 'Napkin';
    }

    // 4. Hair Care, Shampoo & Hair Oils
    if (/SHAMPOO|CONDITIONER|HAIR SPA|HAIR OIL|AMLA OIL|CLINIC PLUS|SUNSILK|HEAD & SHOULDERS|HEAD&SHOULDERS|DOVE SHAMPOO|MEERA SHAMPOO|CHIK|PANTENE|TRESEMME|VATIKA|INDULEKHA|KESH KING|HAIR COLOR|HAIR DYE|GODREJ EXPERT|STREAX|GARNIER COLOR/.test(n)) {
        return 'Shampoo';
    }

    // 5. Chocolates, Confectionery & Sweets
    if (/CHOCOLATE|CHOCO|DAIRY MILK|CADBURY|5 STAR|FIVE STAR|PERK|MUNCH|KIT KAT|KITKAT|BAR-ONE|MILKYBAR|SNICKERS|GALAXY|FERRERO|HERSHEYS|HERSHEY|LOVECANDY|LOLLIPOP|CANDY|TOFFEE|ECLAIRS|ALPENLIEBE|CHUPA CHUPS|MENTOS|CENTER FRESH|CENTER FRUIT|BOOMER|BUBBLEGUM|GEMS|JELLY BELLY|NUTTELLA|NUTELLA|COCOA SPREAD|TRUFFLE|MINT-O|KOPPICO|POPPINS/.test(n)) {
        return 'Chocolates';
    }

    // 6. Cookies
    if (/COOKIE|COOKIES/.test(n)) {
        return 'Cookies';
    }

    // 7. Biscuits & Rusks
    if (/BISCUIT|PARLE|BRITANNIA|MARIE|BOURBON|GOOD DAY|TREAT|JIM JAM|50-50|KRACKJACK|MONACO|HIDE.*SEEK|MILK BIKIS|OREO|SUNFEAST|DARK FANTASY|UNIBIC|RUSK|TOAST|CREAM CRACKER|\bNICE\b|BOUNCE|\bTIGER\b|\bBITE\b|\bBITES\b/.test(n)) {
        return 'Biscuits';
    }

    // 8. Ice Cream
    if (/ICE CREAM|ICECREAM|KULFI|\bCORNETTO\b|CHOCBAR|\bARUN ICE\b|\bARUN ICECREAM\b|\bHAVE-A-NICE-ICE\b|\bKWALITY WALLS\b|CASSATA/.test(n)) {
        return 'Ice Cream';
    }

    // 9. Snacks, Sweets & Dry Fruits (Checked before vegetables so chips/dry fruits are Snacks)
    if (/SNACK|CHIPS|MURUKKU|MIXTURE|SEV|POPCORN|KARA BOONDI|SWEET|LADDU|HALWA|HALWAH|SOAN PAPDI|GULAB JAMUN|DATES|CASHEW|MUNDHIRI|BADAM|BADHAM|ALMOND|PISTA|RAISIN|DRY FRUIT|KISMIS|WALNUT|ANJEER|\bNUT\b|ATHI PALAM|HONEY|\bJAM\b|PEANUT BUTTER|NAMKEEN|BHUJIA|LAYS|KURKURE|BINGO|PRINGLES|CAKE|MUFFIN|\bROLL\b|CHOCO PIE|BOONDI/.test(n)) {
        return 'Snacks';
    }

    // 10. Rice & Poha
    if (/(IDLI RICE|IDLY RICE|PONNI|BASMATI|SONA MASOORI|RAW RICE|BOILED RICE|SEERAGA SAMBA|JEERA RICE|KASHMIRI RICE|\bAVAL\b|\bPOHA\b|\bRICE\b)/.test(n) && !/MIX|POWDER|FLOUR|MASALA|COOKER|NOODLES/.test(n)) {
        return 'Rice';
    }

    // 11. Dhall & Pulses
    if (/PARUPPU|DHALL|\bDAL\b|PAYARU|\bGRAM\b|CHANA|MOONG|URAD|TOOR|THUVARAM|MASOOR|RAJMA|\bPEAS\b|PATTANI|SOYA CHUNKS|MEAL MAKER|ULUNTHU|KADALAI|KOLLU|MOCHAI|SUNDAL|THATAI PAYARU|BLACK GRAM|GREEN GRAM/.test(n)) {
        return 'Dhall';
    }

    // 12. Powders, Masalas, Spices & Staples
    if (/APPALAM|PAPAD|POWDER|MASALA|CHILLI|TURMERIC|CORIANDER|DHANIYA|PEPPER|MILAGU|JEERA|SEERAGAM|CUMIN|MUSTARD|KADUGU|FENUGREEK|VENTHAYAM|SOMBU|ANISEED|CLOVE|LAVANGAM|ELACHI|ELAKKAI|CARDAMOM|CINNAMON|PATTAI|STAR ANISE|BAY LEAF|BIRAYANI|SAMBAR|RASAM|CURRY|GARAM MASALA|AACHI|EVEREST|MDH|SAKTHI|MTR|SALT|\bUPPU\b|SUGAR|\bSAKKARAI\b|JAGGERY|VELLAM|KARUPATTI|TAMARIND|PULI|ASAFOETIDA|PERUNGAYAM|RAVAI|RAVA|MAIDA|ATTA|FLOUR|BESAN|VERMICELLI|SEMIYA|NOODLES|MAGGI|PASTA|VATHAL|VINEGAR|SAUCE|YEAST|CHINA GRASS|GELATINE|PICKLE|OATS|CORN FLAKES|BAKING POWDER|CUSTARD/.test(n)) {
        return 'Powders';
    }

    // 13. Beverages (Tea, Coffee, Soft Drinks, Juices, Milk, Water)
    if (/TEA|CHAI|\bCOFFEE\b|\bBRU\b|NESCAFE|TAJ MAHAL|RED LABEL|3 ROSES|BOOST|HORLICKS|COMPLAN|BOURNVITA|MILK|MILKMAID|BADAM MILK|MAAZA|FROOTI|SLICE|COCA COLA|\bCOKE\b|PEPSI|7UP|SPRITE|MIRINDA|FANTA|THUMS UP|BOVONTO|SODA|\bJUICE\b|SQUASH|SYRUP|ROOHAFZA|BISLERI|AQUAFINA|MINERAL WATER|LIMCA|SARBATH|AROKYA|CURD|BUTTERMILK|LASSI|ENERGY DRINK|RED BULL|STING|CAVIN|TANG|RASNA/.test(n)) {
        return 'Beverages';
    }

    // 14. Cooking Oil & Ghee
    if (/(\bOIL\b|SUNFLOWER|PALMOLEIN|GINGELLY|SESAME|GROUNDNUT|COCONUT OIL|MUSTARD OIL|GHEE|VANASPATI|DALDA|GOLD WINNER|FORTUNE|IDHAYAM|SVVT|ANANDHAM|RKG GHEE|GRB GHEE|PALM OIL)/.test(n) && !/ENGINE OIL|HAIR OIL|BODY OIL|POOJA OIL|BABY OIL|PAIN|HERBAL OIL|AYURVEDIC/.test(n)) {
        return 'Cooking Oil';
    }

    // 15. Vegetables & Fresh Produce
    if (/(\bONION\b|\bPOTATO\b|\bTOMATO\b|\bGINGER\b|\bGARLIC\b|CHILLI GREEN|\bLEMON\b|\bCARROT\b|BEETROOT|CABBAGE|CAULIFLOWER|BRINJAL|LADIES FINGER|DRUMSTICK|\bBANANA\b|\bAPPLE\b|\bORANGE\b|\bMANGO\b|GRAPES|VEGETABLE|\bFRUIT\b|\bCOCONUT\b|TENKAI|VENGAYAM|THAKKALI|POONDU|INJI|CORIANDER LEAF|\bMINT\b|PUDINA|CURRY LEAF)/.test(n) && !/PASTE|POWDER|PICKLE|SAUCE|FLAVOUR|JUICE|CANDY|SOAP|BITE|CRUNCH|BISCUIT|SNACK|TRAY|BASKET|CHIPS/.test(n)) {
        return 'Vegetables';
    }

    // 16. Soaps, Skin & Personal Care / Liquids & Detergents
    if (/SOAP|BODY WASH|SHOWER GEL|FACE WASH|FACIAL|CREAM|LOTION|TALC|POWDER DERMI|PRICKLY HEAT|BOROPLUS|VASELINE|FAIR & LOVELY|GLOW & LOVELY|PONDS|NIVEA|HIMALAYA|DETTOL|LIFEBUOY|LUX|CINTHOL|HAMAM|MEDIMIX|PEARS|SANTOOR|DOVE SOAP|MYSORE SANDAL|VICKS|AMRUTANJAN|IODEX|VOLINI|MOOV|ZANDU|PAIN RELIEVER|PAIN BALM|BALM|HAND WASH|HAND SANITIZER|SANITIZER|DETERGENT|SURF EXCEL|ARIEL|TIDE|RIN|HENKO|GHARI|WHEEL|COMFORT|UJJALA|FABRIC CONDITIONER|BLEACH|SHAVING|RAZOR|BLADE|GILLETTE|AFTER SHAVE|TOOTHPASTE|TOOTHBRUSH|TOOTH BRUSH|COLGATE|PEPSODENT|CLOSE UP|ORAL-B|ORAL B|SENSODYNE|MESWAK|DABUR RED|VICCO/.test(n)) {
        return 'Soaps & Liquids';
    }

    // 17. Bathroom & Cleaning Accessories
    if (/HARPIC|DOMEX|LIZOL|COLIN|PHENOYL|PHENYL|TOILET CLEANER|FLOOR CLEANER|GLASS CLEANER|ROOM SPRAY|AIR FRESHENER|ODONIL|GODREJ AER|AMBIPUR|MOSQUITO|GOOD KNIGHT|ALL OUT|HIT SPRAY|BAYGON|COCKROACH|SCRUBBER|SCRUB PAD|SCOTCH BRITE|STEEL SCRUB|BROOM|STICK BROOM|MOP|WIPER|DUSTBIN|GARBAGE BAG|BUCKET|BATH MUG|SOAP DISH|CLOTHES CLIP|TOILET BRUSH|BATH SPONGE/.test(n)) {
        return 'Bathroom';
    }

    // 18. Household & Kitchen Utensils / Plastics / Hardware
    if (/STEEL|KNIFE|KNIVES|SPOON|PLATE|\bJUG\b|BOTTLE|PLASTIC|CONTAINER|\bBOX\b|BUCKET|VESSEL|COOKER|\bPAN\b|KADAI|TAWA|FLASK|\bLOCK\b|\bKEY\b|ROPE|THREAD|BATTERY|\bCELL\b|BULB|TORCH|LIGHTER|MATCHBOX|THEEPETTI|FOIL|WRAP|STORAGE|DICE STEEL|TRAY|BASKET/.test(n)) {
        return 'Household & Kitchen';
    }

    // 19. Stationery & Office / School Supplies
    if (/(\bPEN\b|\bPENS\b)|PENCIL|NOTEBOOK|\bBOOK\b|RUBBER|ERASER|\bSCALE\b|RULER|CRAYON|CHALK|GLUE|FEVICOL|FEVIKWIK|\bGUM\b|\bTAPE\b|SCISSOR|STAPLER|\bPIN\b|ENVELOPE|MOI COVER|\bCHIT\b|FOLDER|\bFILE\b|MARKER|SKETCH|COLOUR PENCIL|\bINK\b|CALCULATOR|SLATE|GEOMETRY|SHARPENER/.test(n)) {
        return 'Stationery';
    }

    return 'General Groceries';
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

        // Check required columns: product_code, product_name, and (mrp OR price)
        const hasCode = 'product_code' in sampleRow || 'code' in sampleRow || 'sku' in sampleRow;
        const hasName = 'product_name' in sampleRow || 'name' in sampleRow;
        const hasPriceOrMrp = 'mrp' in sampleRow || 'price' in sampleRow;

        const missing = [];
        if (!hasCode) missing.push('product_code');
        if (!hasName) missing.push('product_name');
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
        const insertCategory = db.prepare(`
            INSERT INTO categories (name, icon, display_order)
            VALUES (?, ?, 99)
            ON CONFLICT(name) DO NOTHING
        `);

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
                let category = (row.category || '').trim();

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

                // Auto-infer category if omitted or blank
                if (!category) {
                    category = autoCategorize(productName);
                }

                // Register category in categories table if new
                try {
                    insertCategory.run(category, getCategoryIcon(category));
                } catch (e) {}

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

module.exports = { importProducts, exportProducts, autoCategorize, CATEGORY_ICONS };
