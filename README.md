# ElectroHub

An electronics shopping platform (mobiles, tablets & iPads, laptops, TVs, cameras, accessories such as headphones, smartwatches, power banks & adapters, refrigerators, air conditioners and home appliances) with product specifications, category and specification filters, cart, orders, order tracking and inventory management.

**Stack:** React (Vite) + Tailwind CSS · Node.js/Express REST API · Node SQLite · JWT auth

**Demo only:** Products, prices, reviews, order statuses and delivery estimates are sample data. Checkout never takes payment or ships anything. Do not enter real personal details.

## Run

```bash
./start.bat          # Windows (installs, seeds and starts everything)
```
or manually: `cd server && npm install && npm run seed && npm run dev`, then `cd client && npm install && npm run dev`, and open http://localhost:5173.

| Account | Email | Password |
|---|---|---|
| Customer | demo@electrohub.com | Demo@123 |

For a local admin demo, configure a private `DEMO_ADMIN_EMAIL` and a unique `DEMO_ADMIN_PASSWORD` (16+ characters) in `server/.env` before running `npm run seed`. Configure a random `JWT_SECRET` (32+ characters) there too. Do not commit `.env`. The seeded admin password previously published in this repository is no longer valid for a fresh seed.

**Hosting limit:** Vercel's `/tmp` SQLite is temporary and isolated per function instance. Accounts, carts, inventory and orders can reset or disagree between requests. To publish a dependable multi-user demo, migrate these records to a durable hosted database before deployment. The Vercel deployment requires a private `JWT_SECRET`; without one, the API fails closed. This project is not certified as a production storefront.

## Features
- **Catalog:** 238 products across 9 categories with full specifications (RAM, storage, screen size, capacity, energy rating…)
- **Filters:** category, subcategory, brand, price, discount, rating and **specification filters** generated from each category's specs
- **Login / register** with JWT; customer and admin roles
- **Cart, coupons, checkout** with simulated UPI, card and cash on delivery; no payment gateway or QR
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
| GET | `/payments/config` | Demo payment choices; all transaction endpoints return 410 | – |
| GET/POST/PUT/DELETE | `/admin/products`, `/admin/coupons`, `/admin/offers`, `/admin/orders` | Admin CRUD | Admin |
| GET · POST | `/admin/inventory/summary`, `/admin/inventory/movements` · `/admin/inventory/:id/adjust` | Stock overview, ledger, restock | Admin |

## Database (SQLite)
`users`, `products` (with JSON `specs`), `cart_items`, `wishlist_items`, `addresses`, `orders`, `order_items`, `order_status_history` (tracking), `inventory_movements` (stock ledger), `coupons`, `offers`, `reviews`.
