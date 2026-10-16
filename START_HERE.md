# ElectroHub demo — quick start

Use Node.js 22.13 or newer. See [README.md](README.md) for security and hosting limitations.

1. Copy `server/.env.example` to `server/.env` and set a private random `JWT_SECRET` of at least 32 characters.
2. Optionally set `DEMO_ADMIN_EMAIL` and a unique `DEMO_ADMIN_PASSWORD` of at least 16 characters for a local admin presentation.
3. Run `npm ci && npm run seed && npm start` from `server`, and `npm ci && npm run dev` from `client` in another terminal.
4. Open `http://localhost:5173`. Customer demo login: `demo@electrohub.com` / `Demo@123`.

Explore the catalog, filters, product details, cart, simulated checkout, orders and FAQ. No payment is taken and no item ships. Do not enter real personal data. Running the seed script clears the local demo database.

Vercel's temporary SQLite cannot reliably persist accounts, carts or orders. Use a durable database before calling a hosted version complete.
