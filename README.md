# ElectroHub

An electronics shopping platform (mobiles, tablets & iPads, laptops, TVs, cameras, accessories such as headphones, smartwatches, power banks & adapters, refrigerators, air conditioners and home appliances) with product specifications, category and specification filters, cart, orders, order tracking and inventory management.

**Stack:** React (Vite) + Tailwind CSS · Node.js/Express REST API · SQLite (better-sqlite3) · JWT auth

## Run

```bash
./start.bat          # Windows (installs, seeds and starts everything)
```
or manually: `cd server && npm install && npm run seed && npm run dev`, then `cd client && npm install && npm run dev`, and open http://localhost:5173.

| Account | Email | Password |
|---|---|---|
| Admin (panel at `/admin`) | admin@electrohub.com | Admin@123 |
| Customer | demo@electrohub.com | Demo@123 |

Set your UPI ID in `server/config/payment.js`. Add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` to `server/.env` to enable card payments.

## Features
- **Catalog:** 238 products across 9 categories with full specifications (RAM, storage, screen size, capacity, energy rating…)
- **Filters:** category, subcategory, brand, price, discount, rating and **specification filters** generated from each category's specs
- **Login / register** with JWT; customer and admin roles
- **Cart, coupons, checkout** with UPI QR, card (Razorpay) and cash on delivery
- **Orders & tracking:** status timeline with dates, courier and tracking number; public tracking page at `/track`
- **Inventory:** stock ledger for every sale, cancellation, restock and edit; low/out-of-stock views and quick restock in the admin panel
- **Admin panel:** products, inventory, orders, coupons and home-page offers

## REST API (base `/api`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register`, `/auth/login` | Create account / log in (returns JWT) | – |
| GET/PUT | `/auth/me` | Get / update profile | User |
| GET | `/products` | List with filters: `category, subcategory, brand, minPrice, maxPrice, discount, minRating, search, sort, page, limit, spec_<Name>` (e.g. `spec_RAM=8 GB,12 GB`). Returns products, pagination and facets (incl. `facets.specs`) | – |
| GET | `/products/:id` | Product with specs, reviews and rating summary | – |
| GET | `/products/categories`, `/products/suggestions?q=` | Category tree / search suggestions | – |
| GET | `/products/trending`, `/new-arrivals`, `/deals`, `/top-rated` | Curated lists | – |
| GET/POST/PUT/DELETE | `/cart`, `/cart/:itemId` | Cart | User |
| GET/POST/DELETE | `/wishlist/:productId` | Wishlist | User |
| GET/POST/PUT/DELETE | `/addresses/:id` | Saved addresses | User |
| GET · POST | `/coupons` · `/coupons/apply` | Available coupons / validate a coupon | – · User |
| POST · GET | `/orders` · `/orders`, `/orders/:id` | Place order / my orders (with tracking history) | User |
| PUT | `/orders/:id/cancel` | Cancel (restocks items) | User |
| GET | `/orders/track?orderId=&email=` | Public order tracking | – |
| GET · POST | `/payments/config` · `/payments/upi/:orderId/confirm` | Payment options / submit UPI reference | – · User |
| GET/POST/PUT/DELETE | `/admin/products`, `/admin/coupons`, `/admin/offers`, `/admin/orders` | Admin CRUD | Admin |
| GET · POST | `/admin/inventory/summary`, `/admin/inventory/movements` · `/admin/inventory/:id/adjust` | Stock overview, ledger, restock | Admin |

## Database (SQLite)
`users`, `products` (with JSON `specs`), `cart_items`, `wishlist_items`, `addresses`, `orders`, `order_items`, `order_status_history` (tracking), `inventory_movements` (stock ledger), `coupons`, `offers`, `reviews`.
