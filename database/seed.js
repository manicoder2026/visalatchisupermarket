// database/seed.js
// -----------------------------------------------------------------
// Fills the database with starter data: categories + ~45 sample
// products with pictures (covering every category requested).
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

// Product tuples: [code, name, category, sub_category, brand, price, offer_price, stock, unit, image]
const products = [
    // Cookies
    ['CKI001', 'Britannia Good Day Butter Cookies', 'Cookies', 'Butter Cookies', 'Britannia', 90, 82, 40, '200 g', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80'],
    ['CKI002', 'Sunfeast Mom\'s Magic Cashew Cookies', 'Cookies', 'Cashew Cookies', 'Sunfeast', 45, null, 55, '100 g', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80'],
    ['CKI003', 'Parle Kreams Elaichi Cookies', 'Cookies', 'Elaichi Cookies', 'Parle', 30, 27, 60, '100 g', 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=500&auto=format&fit=crop&q=80'],

    // Biscuits
    ['BIS001', 'Parle-G Original Glucose Biscuits', 'Biscuits', 'Glucose', 'Parle', 10, null, 200, '70 g', 'https://images.unsplash.com/photo-1548741487-18d16a145e80?w=500&auto=format&fit=crop&q=80'],
    ['BIS002', 'Britannia Marie Gold', 'Biscuits', 'Marie', 'Britannia', 35, 32, 90, '250 g', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80'],
    ['BIS003', 'Oreo Original Biscuits', 'Biscuits', 'Cream Biscuits', 'Oreo', 30, null, 75, '120 g', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80'],

    // Chocolates
    ['CHO001', 'Cadbury Dairy Milk Chocolate', 'Chocolates', 'Milk Chocolate', 'Cadbury', 50, 45, 100, '55 g', 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80'],
    ['CHO002', 'Nestle KitKat 4 Finger', 'Chocolates', 'Wafer Chocolate', 'Nestle', 40, null, 80, '37.3 g', 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&auto=format&fit=crop&q=80'],
    ['CHO003', 'Amul Dark Chocolate', 'Chocolates', 'Dark Chocolate', 'Amul', 60, 54, 40, '40 g', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80'],

    // Ice Cream
    ['ICE001', 'Amul Vanilla Ice Cream Tub', 'Ice Cream', 'Vanilla', 'Amul', 150, 139, 25, '1 L', 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&auto=format&fit=crop&q=80'],
    ['ICE002', 'Vadilal Butterscotch Ice Cream', 'Ice Cream', 'Butterscotch', 'Vadilal', 140, null, 20, '750 ml', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=80'],

    // Snacks
    ['SNK001', 'Lay\'s Classic Salted Chips', 'Snacks', 'Chips', 'Lay\'s', 20, null, 150, '52 g', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80'],
    ['SNK002', 'Haldiram\'s Aloo Bhujia', 'Snacks', 'Namkeen', 'Haldiram\'s', 55, 49, 60, '200 g', 'https://images.unsplash.com/photo-1621996346565-e3d5d6281e4b?w=500&auto=format&fit=crop&q=80'],
    ['SNK003', 'Kurkure Masala Munch', 'Snacks', 'Extruded Snacks', 'Kurkure', 20, null, 120, '90 g', 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=500&auto=format&fit=crop&q=80'],

    // Rice
    ['RIC001', 'Aashirvaad Rice', 'Rice', 'Raw Rice', 'Aashirvaad', 650, 599, 30, '5 kg', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80'],
    ['RIC002', 'India Gate Basmati Rice', 'Rice', 'Basmati', 'India Gate', 720, 680, 25, '5 kg', 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500&auto=format&fit=crop&q=80'],
    ['RIC003', 'Ponni Boiled Rice', 'Rice', 'Ponni', 'Local', 300, null, 50, '5 kg', 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=500&auto=format&fit=crop&q=80'],

    // Dhall
    ['DHL001', 'Toor Dal (Thuvaram Paruppu)', 'Dhall', 'Toor Dal', 'Local', 160, 150, 60, '1 kg', 'https://images.unsplash.com/photo-1585994192701-f1a505c817ea?w=500&auto=format&fit=crop&q=80'],
    ['DHL002', 'Moong Dal (Pasi Paruppu)', 'Dhall', 'Moong Dal', 'Local', 140, null, 55, '1 kg', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80'],
    ['DHL003', 'Urad Dal (Ulundu Paruppu)', 'Dhall', 'Urad Dal', 'Local', 155, 145, 45, '1 kg', 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500&auto=format&fit=crop&q=80'],

    // Powders
    ['POW001', 'Sakthi Sambar Powder', 'Powders', 'Sambar Powder', 'Sakthi', 65, null, 70, '200 g', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80'],
    ['POW002', 'Aachi Rasam Powder', 'Powders', 'Rasam Powder', 'Aachi', 60, 55, 65, '200 g', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&auto=format&fit=crop&q=80'],
    ['POW003', 'Everest Turmeric Powder', 'Powders', 'Turmeric', 'Everest', 40, null, 80, '100 g', 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=500&auto=format&fit=crop&q=80'],

    // Baby Items
    ['BAB001', 'Pampers Baby Dry Diapers (M)', 'Baby Items', 'Diapers', 'Pampers', 450, 399, 30, '46 pcs', 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&auto=format&fit=crop&q=80'],
    ['BAB002', 'Johnson\'s Baby Powder', 'Baby Items', 'Baby Care', 'Johnson\'s', 150, null, 40, '200 g', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80'],
    ['BAB003', 'Cerelac Baby Food Wheat', 'Baby Items', 'Baby Food', 'Nestle', 220, 205, 25, '300 g', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'],

    // Napkin
    ['NAP001', 'Whisper Ultra Sanitary Napkins', 'Napkin', 'Sanitary Napkins', 'Whisper', 95, 85, 60, '30 pads', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80'],
    ['NAP002', 'Origami Tissue Napkins', 'Napkin', 'Tissue', 'Origami', 60, null, 90, '100 pcs', 'https://images.unsplash.com/photo-1584556812953-305b1640a454?w=500&auto=format&fit=crop&q=80'],

    // Shampoo
    ['SHM001', 'Clinic Plus Strong & Long Shampoo', 'Shampoo', 'Anti Hairfall', 'Clinic Plus', 180, 165, 45, '340 ml', 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80'],
    ['SHM002', 'Head & Shoulders Anti-Dandruff', 'Shampoo', 'Anti Dandruff', 'Head & Shoulders', 210, null, 35, '340 ml', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80'],
    ['SHM003', 'Sunsilk Black Shine Shampoo', 'Shampoo', 'Black Shine', 'Sunsilk', 150, 139, 50, '340 ml', 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80'],

    // Pooja Items
    ['POJ001', 'Cycle Agarbatti Sandalwood', 'Pooja Items', 'Agarbatti', 'Cycle', 40, null, 100, '120 sticks', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&auto=format&fit=crop&q=80'],
    ['POJ002', 'Camphor Tablets (Karpooram)', 'Pooja Items', 'Camphor', 'Local', 35, 30, 80, '50 g', 'https://images.unsplash.com/photo-1602874801007-bd458bb1b8b8?w=500&auto=format&fit=crop&q=80'],
    ['POJ003', 'Cotton Wicks (Thiri)', 'Pooja Items', 'Wicks', 'Local', 20, null, 120, '1 pack', 'https://images.unsplash.com/photo-1508672019048-805b876b67e2?w=500&auto=format&fit=crop&q=80'],

    // Soaps & Liquids
    ['SOP001', 'Lifebuoy Total Soap', 'Soaps & Liquids', 'Bath Soap', 'Lifebuoy', 40, 36, 100, '125 g', 'https://images.unsplash.com/photo-1607006314177-3e11e03e4450?w=500&auto=format&fit=crop&q=80'],
    ['SOP002', 'Vim Dishwash Liquid', 'Soaps & Liquids', 'Dishwash', 'Vim', 110, 99, 60, '750 ml', 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&auto=format&fit=crop&q=80'],
    ['SOP003', 'Surf Excel Detergent Liquid', 'Soaps & Liquids', 'Laundry', 'Surf Excel', 250, 229, 40, '1 L', 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=500&auto=format&fit=crop&q=80'],

    // Bathroom (using authentic local images)
    ['BTH001', 'Harpic Toilet Cleaner', 'Bathroom', 'Toilet Cleaner', 'Harpic', 105, 95, 55, '1 L', '/images/products/product-1789629564685.jpg'],
    ['BTH002', 'Scotch-Brite Bathroom Scrub Brush', 'Bathroom', 'Cleaning Tools', 'Scotch-Brite', 85, null, 45, '1 pc', '/images/products/product-1789629555503.jpg'],

    // Stationery (using authentic local images)
    ['STA001', 'Classmate Notebook 200 Pages', 'Stationery', 'Notebooks', 'Classmate', 60, null, 150, '1 pc', '/images/products/product-1789629543202.jpg'],
    ['STA002', 'Cello Ball Pen Pack of 5', 'Stationery', 'Pens', 'Cello', 30, 25, 200, '5 pcs', 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80'],
    ['STA003', 'Camlin Pencil Box Set', 'Stationery', 'Pencils', 'Camlin', 45, null, 90, '1 set', '/images/products/product-1789629510116.jpg'],

    // Vegetables (using authentic local images)
    ['VEG001', 'Fresh Tomato', 'Vegetables', 'Fresh Vegetables', 'Local Farm', 40, null, 100, '1 kg', '/images/products/product-1789628992900.jpg'],
    ['VEG002', 'Fresh Onion', 'Vegetables', 'Fresh Vegetables', 'Local Farm', 35, 30, 120, '1 kg', '/images/products/product-1789629485382.jpg'],
    ['VEG003', 'Fresh Potato', 'Vegetables', 'Fresh Vegetables', 'Local Farm', 30, null, 130, '1 kg', '/images/products/product-1789629495740.jpg'],
    ['VEG004', 'Fresh Carrot', 'Vegetables', 'Fresh Vegetables', 'Local Farm', 50, 45, 60, '1 kg', '/images/products/product-1788779966955.jpg']
];

const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name, icon, display_order)
    VALUES (?, ?, ?)
`);

const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products
        (product_code, product_name, category, sub_category, brand, price, offer_price, stock, unit, image, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
`);

const updateProductImage = db.prepare(`
    UPDATE products SET image = ? WHERE product_code = ? AND (image IS NULL OR image = '')
`);

const seed = db.transaction(() => {
    categories.forEach((cat, index) => {
        insertCategory.run(cat.name, cat.icon, index);
    });

    products.forEach((p) => {
        // p = [code, name, category, sub_category, brand, price, offer_price, stock, unit, image]
        insertProduct.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9] || null);
        if (p[9]) {
            updateProductImage.run(p[9], p[0]);
        }
    });
});

function runSeed() {
    seed();
    console.log(`Seed complete: ${categories.length} categories, ${products.length} sample products with pictures updated.`);
    console.log('Replace this sample data any time using Admin Dashboard -> Product Import.');
}

if (require.main === module) {
    runSeed();
}

module.exports = runSeed;
