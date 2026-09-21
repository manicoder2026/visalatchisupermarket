// server/middleware/upload.js
// -----------------------------------------------------------------
// Handles file uploads using Multer:
//   1. Product images  -> saved into /public/images/products/
//   2. CSV/Excel import -> saved temporarily into /uploads/
// -----------------------------------------------------------------

const multer = require('multer');
const path = require('path');
require('dotenv').config();

const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE || '2097152', 10); // 2 MB default

// ---------- Product image storage ----------
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'public', 'images', 'products'));
    },
    filename: (req, file, cb) => {
        // Use the product code (if provided) + timestamp to avoid overwriting files
        const productCode = (req.body.product_code || 'product').replace(/[^a-zA-Z0-9-_]/g, '');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${productCode}-${Date.now()}${ext}`);
    }
});

function imageFileFilter(req, file, cb) {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedTypes.includes(ext)) {
        return cb(new Error('Only JPG, JPEG, PNG and WEBP image files are allowed.'));
    }
    cb(null, true);
}

const uploadImage = multer({
    storage: imageStorage,
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: imageFileFilter
});

// ---------- CSV import storage ----------
const csvStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, `import-${Date.now()}.csv`);
    }
});

function csvFileFilter(req, file, cb) {
    const allowedTypes = ['.csv'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedTypes.includes(ext)) {
        return cb(new Error('Please upload a .csv file. Convert Excel files to CSV first (File > Save As > CSV).'));
    }
    cb(null, true);
}

const uploadCsv = multer({
    storage: csvStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB, enough for a few thousand product rows
    fileFilter: csvFileFilter
});

module.exports = { uploadImage, uploadCsv };
