// database/seed.js
// -----------------------------------------------------------------
// Fills the database with starter data: categories + ~45 sample
// products (covering every category requested).
//
// This is ONLY sample data. When the real 3000-product list is
// ready, use the Admin Dashboard -> Product Import feature instead
// of editing this file. See README.md "Product Import" section.
//
// Run with:  npm run seed
// -----------------------------------------------------------------

const db = require('../server/db');

const categories = [
    { name: 'Cookies',          icon: '🍪' },
    { name: 'Biscuits',         icon: '🍘' },
    { name: 'Chocolates',       icon: '🍫' },
    { name: 'Ice Cream',        icon: '🍨' },
    { name: 'Snacks',           icon: '🥨' },
    { name: 'Rice',             icon: '🍚' },
    { name: 'Dhall',            icon: '🌾' },
    { name: 'Powders',          icon: '🥄' },
    { name: 'Baby Items',       icon: '🍼' },
    { name: 'Napkin',           icon: '🧻' },
    { name: 'Shampoo',          icon: '🧴' },
    { name: 'Pooja Items',      icon: '🪔' },
    { name: 'Soaps & Liquids',  icon: '🧼' },
    { name: 'Bathroom',         icon: '🚿' },
    { name: 'Stationery',       icon: '✏️' },
    { name: 'Vegetables',       icon: '🥬' }
];

// A handful of realistic sample products per category.
// Prices are illustrative placeholders, NOT real store prices.
const products = [
    // Cookies
    ['CKI001', 'Britannia Good Day Butter Cookies', 'Cookies', 'Butter Cookies', 'Britannia', 90, 82, 40, '200 g'],
    ['CKI002', 'Sunfeast Mom\'s Magic Cashew Cookies', 'Cookies', 'Cashew Cookies', 'Sunfeast', 45, null, 55, '100 g'],
    ['CKI003', 'Parle Kreams Elaichi Cookies', 'Cookies', 'Elaichi Cookies', 'Parle', 30, 27, 60, '100 g'],

    // Biscuits
    ['BIS001', 'Parle-G Original Glucose Biscuits', 'Biscuits', 'Glucose', 'Parle', 10, null, 200, '70 g'],
    ['BIS002', 'Britannia Marie Gold', 'Biscuits', 'Marie', 'Britannia', 35, 32, 90, '250 g'],
    ['BIS003', 'Oreo Original Biscuits', 'Biscuits', 'Cream Biscuits', 'Oreo', 30, null, 75, '120 g'],

    // Chocolates
    ['CHO001', 'Cadbury Dairy Milk Chocolate', 'Chocolates', 'Milk Chocolate', 'Cadbury', 50, 45, 100, '55 g'],
    ['CHO002', 'Nestle KitKat 4 Finger', 'Chocolates', 'Wafer Chocolate', 'Nestle', 40, null, 80, '37.3 g'],
    ['CHO003', 'Amul Dark Chocolate', 'Chocolates', 'Dark Chocolate', 'Amul', 60, 54, 40, '40 g'],

    // Ice Cream
    ['ICE001', 'Amul Vanilla Ice Cream Tub', 'Ice Cream', 'Vanilla', 'Amul', 150, 139, 25, '1 L'],
    ['ICE002', 'Vadilal Butterscotch Ice Cream', 'Ice Cream', 'Butterscotch', 'Vadilal', 140, null, 20, '750 ml'],

    // Snacks
    ['SNK001', 'Lay\'s Classic Salted Chips', 'Snacks', 'Chips', 'Lay\'s', 20, null, 150, '52 g'],
    ['SNK002', 'Haldiram\'s Aloo Bhujia', 'Snacks', 'Namkeen', 'Haldiram\'s', 55, 49, 60, '200 g'],
    ['SNK003', 'Kurkure Masala Munch', 'Snacks', 'Extruded Snacks', 'Kurkure', 20, null, 120, '90 g'],

    // Rice
    ['RIC001', 'Aashirvaad Rice', 'Rice', 'Raw Rice', 'Aashirvaad', 650, 599, 30, '5 kg'],
    ['RIC002', 'India Gate Basmati Rice', 'Rice', 'Basmati', 'India Gate', 720, 680, 25, '5 kg'],
    ['RIC003', 'Ponni Boiled Rice', 'Rice', 'Ponni', 'Local', 300, null, 50, '5 kg'],

    // Dhall
    ['DHL001', 'Toor Dal (Thuvaram Paruppu)', 'Dhall', 'Toor Dal', 'Local', 160, 150, 60, '1 kg'],
    ['DHL002', 'Moong Dal (Pasi Paruppu)', 'Dhall', 'Moong Dal', 'Local', 140, null, 55, '1 kg'],
    ['DHL003', 'Urad Dal (Ulundu Paruppu)', 'Dhall', 'Urad Dal', 'Local', 155, 145, 45, '1 kg'],

    // Powders
    ['POW001', 'Sakthi Sambar Powder', 'Powders', 'Sambar Powder', 'Sakthi', 65, null, 70, '200 g'],
    ['POW002', 'Aachi Rasam Powder', 'Powders', 'Rasam Powder', 'Aachi', 60, 55, 65, '200 g'],
    ['POW003', 'Everest Turmeric Powder', 'Powders', 'Turmeric', 'Everest', 40, null, 80, '100 g'],

    // Baby Items
    ['BAB001', 'Pampers Baby Dry Diapers (M)', 'Baby Items', 'Diapers', 'Pampers', 450, 399, 30, '46 pcs'],
    ['BAB002', 'Johnson\'s Baby Powder', 'Baby Items', 'Baby Care', 'Johnson\'s', 150, null, 40, '200 g'],
    ['BAB003', 'Cerelac Baby Food Wheat', 'Baby Items', 'Baby Food', 'Nestle', 220, 205, 25, '300 g'],

    // Napkin
    ['NAP001', 'Whisper Ultra Sanitary Napkins', 'Napkin', 'Sanitary Napkins', 'Whisper', 95, 85, 60, '30 pads'],
    ['NAP002', 'Origami Tissue Napkins', 'Napkin', 'Tissue', 'Origami', 60, null, 90, '100 pcs'],

    // Shampoo
    ['SHM001', 'Clinic Plus Strong & Long Shampoo', 'Shampoo', 'Anti Hairfall', 'Clinic Plus', 180, 165, 45, '340 ml'],
    ['SHM002', 'Head & Shoulders Anti-Dandruff', 'Shampoo', 'Anti Dandruff', 'Head & Shoulders', 210, null, 35, '340 ml'],
    ['SHM003', 'Sunsilk Black Shine Shampoo', 'Shampoo', 'Black Shine', 'Sunsilk', 150, 139, 50, '340 ml'],

    // Pooja Items
    ['POJ001', 'Cycle Agarbatti Sandalwood', 'Pooja Items', 'Agarbatti', 'Cycle', 40, null, 100, '120 sticks'],
    ['POJ002', 'Camphor Tablets (Karpooram)', 'Pooja Items', 'Camphor', 'Local', 35, 30, 80, '50 g'],
    ['POJ003', 'Cotton Wicks (Thiri)', 'Pooja Items', 'Wicks', 'Local', 20, null, 120, '1 pack'],

    // Soaps & Liquids
    ['SOP001', 'Lifebuoy Total Soap', 'Soaps & Liquids', 'Bath Soap', 'Lifebuoy', 40, 36, 100, '125 g'],
    ['SOP002', 'Vim Dishwash Liquid', 'Soaps & Liquids', 'Dishwash', 'Vim', 110, 99, 60, '750 ml'],
    ['SOP003', 'Surf Excel Detergent Liquid', 'Soaps & Liquids', 'Laundry', 'Surf Excel', 250, 229, 40, '1 L'],

    // Bathroom
    ['BTH001', 'Harpic Toilet Cleaner', 'Bathroom', 'Toilet Cleaner', 'Harpic', 105, 95, 55, '1 L'],
    ['BTH002', 'Scotch-Brite Bathroom Scrub Brush', 'Bathroom', 'Cleaning Tools', 'Scotch-Brite', 85, null, 45, '1 pc'],

    // Stationery
    ['STA001', 'Classmate Notebook 200 Pages', 'Stationery', 'Notebooks', 'Classmate', 60, null, 150, '1 pc'],
    ['STA002', 'Cello Ball Pen Pack of 5', 'Stationery', 'Pens', 'Cello', 30, 25, 200, '5 pcs'],
    ['STA003', 'Camlin Pencil Box Set', 'Stationery', 'Pencils', 'Camlin', 45, null, 90, '1 set'],

    // Vegetables
    ['VEG001', 'Fresh Tomato', 'Vegetables', 'Fresh Vegetables', 'Local Farm', 40, null, 100, '1 kg'],
    ['VEG002', 'Fresh Onion', 'Vegetables', 'Fresh Vegetables', 'Local Farm', 35, 30, 120, '1 kg'],
    ['VEG003', 'Fresh Potato', 'Vegetables', 'Fresh Vegetables', 'Local Farm', 30, null, 130, '1 kg'],
    ['VEG004', 'Fresh Carrot', 'Vegetables', 'Fresh Vegetables', 'Local Farm', 50, 45, 60, '1 kg']
];

const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name, icon, display_order)
    VALUES (?, ?, ?)
`);

const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products
        (product_code, product_name, category, sub_category, brand, price, offer_price, stock, unit, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
`);

const seed = db.transaction(() => {
    categories.forEach((cat, index) => {
        insertCategory.run(cat.name, cat.icon, index);
    });

    products.forEach((p) => {
        // p = [code, name, category, sub_category, brand, price, offer_price, stock, unit]
        insertProduct.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]);
    });
});

function runSeed() {
    seed();
    console.log(`Seed complete: ${categories.length} categories, ${products.length} sample products inserted.`);
    console.log('Replace this sample data any time using Admin Dashboard -> Product Import.');
}

if (require.main === module) {
    runSeed();
}

module.exports = runSeed;
