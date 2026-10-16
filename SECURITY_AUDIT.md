# ElectroHub demo review — 16 October 2026

This is a targeted code review and local smoke test, not a penetration test or a security certification.

## Fixed in this change
- Product-card hover no longer calls a React hook conditionally, which caused the blank product page on navigation.
- Removed the public fallback JWT secret, rejects the old value on hosted deployment, pins JWT verification to HS256, reduces token lifetime, and revokes the old seeded admin password on existing demo databases.
- Fresh seeds create an admin only when a private email and 16+ character password are provided through environment variables.
- Removed the real UPI payee and all payment initiation/verification routes. UPI, card and COD are simulated checkout choices; retired payment URLs return 410.
- Limited JSON body size, added API rate limits and auth-specific rate limits, restricted CORS to configured origins, enabled a CSP and other headers in both Express and Vercel, and hid server errors in production.
- Added input limits for profile, addresses and reviews; constrained admin offer paths and image URLs. React renders customer text as text.
- Removed tracked SQLite WAL/SHM files, unused payment packages, placeholder support identity, misleading delivery/returns promises and published admin setup password.
- Added an expandable FAQ, privacy choice, session-only UTM attribution after consent, help link and print styles. Other requested interface controls already existed.

## Verification
- Vite production build passed. `npm audit` reported zero findings for client and server after one transitive dependency fix.
- Local API checks passed for malformed registration (400), customer login (200), admin denial (403), old public JWT denial (401), retired payment endpoint (410), blocked unapproved CORS origin, product read, cart add and simulated order creation.
- Git history search found the old JWT fallback, published admin credential and UPI payee. Removing them from the current tree does not erase the public history. Rotate any reused JWT secret, admin password and payment credentials outside this repository.

## Required before a dependable hosted demo
1. Set a new random `JWT_SECRET` (at least 32 characters) in Vercel Production and Preview settings. Do not share the value in chat or commit it. Provision a fresh private admin credential only if the admin panel is needed.
2. Replace local `/tmp` SQLite with durable hosted storage. Vercel documents that local SQLite state cannot persist reliably across functions. Migrate accounts, carts, orders, inventory, addresses and reviews; test ownership and concurrent stock updates.
3. Replace or verify generated product specifications, photos, prices and reviews if the demo will be presented as an accurate catalog. Current seed data is illustrative.
4. Use shared rate-limit storage or platform edge limits when deployed. The current in-memory limiter is per process and does not enforce a global quota across Vercel instances.
5. Move JWTs from browser localStorage to a server-managed HttpOnly/Secure/SameSite session if the project becomes a real store. Add login recovery, session revocation, CSRF protection appropriate to cookie auth, automated integration tests and an independent security review.

## Reusable implementation prompt
> Work in the `deadmouser638/stylehub` repository. Keep ElectroHub explicitly a demo: no real payments, no UPI QR, no shipping and no real personal data. First read `SECURITY_AUDIT.md` and `README.md`. Migrate the Express API from Vercel `/tmp` SQLite to a durable managed database using migrations, seed only sample catalog data, and preserve per-user ownership for carts, addresses, orders and reviews. Use a private environment secret for authentication and a private admin bootstrap; never place credentials in source, build output or logs. Replace process-local rate limits with shared limits. Test two concurrent users, stock races, login/admin denial, cart-to-order continuity across separate function instances, cancellation/restock, input validation and CSP/CORS behavior. Run a production build and dependency audit, review Git history for secrets without printing them, and document exact Vercel environment names and migration/deployment steps. Do not publish until the durable data and security tests pass. Report unresolved risks plainly; do not claim the store is secure merely because a scanner reports zero findings.
