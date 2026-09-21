# Visalatchi Super Market — Online Ordering Website

A complete e-commerce website for **Visalatchi Super Market**, Sivakasi Road,
Virudhunagar – 626001, Tamil Nadu, India. Customers can browse products,
add them to a cart, and place an order for **free home delivery** — no
account required. Staff get a dashboard to manage products and orders.

**Tech stack:** HTML5 + CSS3 + Vanilla JavaScript (frontend), Node.js +
Express (backend), SQLite (database, via `better-sqlite3` — no separate
database server to install).

---

## 1. Project Structure

```
visalatchi-super-market/
│
├── public/                  Frontend (served directly by Express)
│   ├── index.html           Homepage
│   ├── products.html        Product listing (filters, search, pagination)
│   ├── cart.html             Shopping cart
│   ├── checkout.html         Guest checkout
│   ├── order-success.html    Order confirmation
│   ├── order-tracking.html   Order status tracker
│   ├── admin.html            Staff/admin dashboard
│   ├── css/style.css         All styling (green theme, responsive)
│   ├── js/                   Frontend JavaScript, one file per concern
│   └── images/               Category & product images
│
├── server/
│   ├── server.js             App entry point
│   ├── db.js                 SQLite connection (auto-creates tables)
│   ├── routes/                API route definitions
│   ├── controllers/           Route logic
│   └── middleware/            Admin auth + file upload handling
│
├── database/
│   ├── schema.sql             Full SQL schema
│   ├── seed.js                 Sample data loader (~45 products)
│   └── sample-import.csv       Example file for the CSV import feature
│
├── uploads/                    Temporary folder used during CSV import
├── .env.example                 Copy this to .env and fill in values
├── package.json
└── README.md                    This file
```

---

## 2. Requirements

- [Node.js](https://nodejs.org) version 18 or later (includes npm)
- A terminal / command prompt
- No separate database software needed — SQLite runs as a plain file

---

## 3. Installation

Open a terminal in the project folder and run:

```bash
npm install
```

This downloads all required packages (Express, better-sqlite3, bcryptjs, etc.)

Next, create your environment file:

```bash
cp .env.example .env
```

(On Windows, use `copy .env.example .env` instead.)

Open `.env` in a text editor and set your own values, especially:
- `JWT_SECRET` — any long random string
- `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` — your staff login

---

## 4. Database Setup

The database is created **automatically** the first time you run the app —
`server/db.js` reads `database/schema.sql` and creates all tables if they
don't already exist. You don't need to run any SQL manually.

To load the ~45 sample products (covering every category) so the site
isn't empty on first run:

```bash
npm run seed
```

You only need to run this once. Running it again is safe — it won't
create duplicate rows (it uses `INSERT OR IGNORE`).

---

## 5. Running the Website

```bash
npm start
```

You should see:

```
===================================================
  VISALATCHI SUPER MARKET server is running
  Website:        http://localhost:3000
  Admin login:    http://localhost:3000/admin.html
===================================================
```

Open **http://localhost:3000** in your browser — that's the customer-facing
website. Open **http://localhost:3000/admin.html** for the staff dashboard.

For development (auto-restarts when you edit files), use:

```bash
npm run dev
```

To stop the server, press `Ctrl + C` in the terminal.

---

## 6. Admin / Staff Login

A default admin account is created automatically the first time the server
starts, using the username/password from your `.env` file
(`DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`).

**Change this password** by editing the `admins` table directly, or by
extending the dashboard with a "change password" screen later — see
"Future Improvements" below.

From the dashboard you can:
- View today's orders/sales at a glance (**Dashboard**)
- Add, edit, remove, and search products (**Products**)
- Upload a product image (edit a product → choose an image file)
- Bulk-import products from CSV, export the current catalog, and bulk-update
  prices by category (**Import / Export**)
- View and update order status, and check off items as they're packed
  (**Orders**)

---

## 7. How to Import the 3000-Product List

The real product list will arrive as a Word document. This app imports
**CSV**, so convert it first:

1. Open the Word document.
2. Select the product table.
3. Paste it into Excel or Google Sheets (this turns it into proper rows/columns).
4. Make sure the column headers match (rename them if needed):

   ```
   product_code,product_name,category,sub_category,brand,description,price,offer_price,stock,unit,image
   ```

   Only `product_code`, `product_name`, `category`, and `price` are
   required — the rest are optional.
5. Save/export as **CSV** (in Excel: File → Save As → CSV; in Google
   Sheets: File → Download → Comma Separated Values).
6. Go to the admin dashboard → **Import / Export** → choose your CSV file
   → **Upload & Import**.

The importer will:
- Validate each row (missing names, invalid prices/categories, etc.)
- Show you exactly which rows failed and why
- Add new products, and **update** any product whose `product_code`
  already exists (instead of creating a duplicate)

A ready-to-try example file is included at `database/sample-import.csv`.

You can also click **Download Current Products (CSV)** any time to export
everything currently in the store — useful as a backup, or to bulk-edit
prices in Excel and re-upload.

---

## 8. How to Add Product Images

**Option A — one at a time (recommended for a handful of products):**
Admin Dashboard → Products → Edit a product → choose an image file (JPG,
JPEG, PNG or WEBP) → Save. The image is copied into
`public/images/products/` automatically.

**Option B — in bulk (for the 3000-product list):**
1. Name your image files after each product's `product_code`
   (e.g. `RIC001.jpg`).
2. Copy them all into `public/images/products/`.
3. Include an `image` column in your import CSV with the matching path,
   e.g. `/images/products/RIC001.jpg`.
4. Import the CSV — the `image` path will be saved against each product.

If a product has no image, the website automatically shows a clean
"Product Image Coming Soon" placeholder instead of a broken image.

---

## 9. Running the Project Locally — Quick Reference

```bash
npm install             # install dependencies (run once)
cp .env.example .env    # create your environment file (run once)
npm run seed            # load sample product data (run once)
npm start                # start the website
```

Then visit:
- Website: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin.html

---

## 10. API Overview

All endpoints are prefixed with `/api`.

**Public (no login required):**
```
GET  /api/products                     list products (filters, pagination, sort)
GET  /api/products/:id                 single product + related products
GET  /api/products/category/:category  products in a category
GET  /api/products/search?q=rice       search by name/brand/category/code
GET  /api/products/brands              list of all brands (for filters)
GET  /api/categories                   list of categories with product counts
POST /api/orders                       place an order (guest checkout)
GET  /api/orders/:id                   order details (by numeric id or order_number)
PUT  /api/orders/:id/status            update order status
POST /api/admin/login                  staff login (returns a token)
```

**Admin only (require `Authorization: Bearer <token>` header):**
```
GET    /api/admin/dashboard                        stats
GET    /api/admin/products                          all products (search/pagination)
POST   /api/admin/products                          add product
PUT    /api/admin/products/:id                        edit product
DELETE /api/admin/products/:id                        remove product (soft delete)
POST   /api/admin/products/:id/image                  upload product image
PUT    /api/admin/products/bulk/price                bulk price update by category
PUT    /api/admin/products/bulk/stock                bulk stock update
POST   /api/admin/import                              CSV product import
GET    /api/admin/export                              CSV product export
GET    /api/admin/orders                              list orders (filter by status)
GET    /api/admin/orders/:id                           order detail (staff packing screen)
PUT    /api/admin/orders/:id/items/:itemId/pack        toggle a packed checkbox
```

---

## 11. Security Notes

- Passwords are hashed with bcrypt — never stored in plain text.
- Admin routes are protected by a signed JWT token (`JWT_SECRET` in `.env`).
- Product prices are always re-read from the database at checkout — the
  frontend cannot manipulate an order's price.
- Uploaded images are restricted to JPG/JPEG/PNG/WEBP and a size limit
  (`MAX_IMAGE_SIZE` in `.env`).
- Never commit your real `.env` file — only `.env.example` should be in
  version control.

---

## 12. Future Improvements

Ideas for extending this project later:

- Add a "change admin password" screen in the dashboard
- Add customer accounts with order history (schema already supports this
  via the `users` table)
- Add the Tamil language toggle (a `தமிழ்` button placeholder is a natural
  next step — this app currently ships English-only, as requested)
- Add SMS/WhatsApp order notifications
- Add a real Google Maps embed on the Contact section
- Add product ratings/reviews
- Move from SQLite to MySQL/PostgreSQL if the store grows beyond a single
  local server (the schema notes the small syntax differences needed)

---

## 13. Placeholders You Still Need to Fill In

This project intentionally does **not** invent business details that
weren't provided. Before going live, update these:

- Phone number (footer, Contact section)
- Email address (footer, Contact section)
- Opening hours (Contact section)
- Google Maps embed link (Contact section)
- Admin password (`.env`)
- Real product data (via CSV import, once the Word document is converted)
- Real product photos (via the image upload feature)
