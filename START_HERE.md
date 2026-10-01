# ElectroHub — presentation edition

## Run immediately on Windows
1. Extract the complete ZIP.
2. Use Node.js 22.13+ (24 LTS recommended).
3. Double-click PRESENT.bat. Keep the terminal open.
4. Open http://localhost:5000 (refresh after the terminal says the server is running).

The frontend is already built. First launch needs internet to install backend dependencies. Catalog photography also needs internet; the interactive hero is rendered locally without image downloads.

Customer: demo@electrohub.com / Demo@123
Admin: admin@electrohub.com / Admin@123
Admin page: http://localhost:5000/admin

## 3-minute presentation flow
- Introduce ElectroHub as a React + Express + SQLite electronics store.
- Switch Laptops / Mobiles / Accessories in the hero; move the pointer over the device.
- Explore a category and demonstrate search/filtering, product detail and wishlist.
- Sign in as the customer, add an in-stock product, and open the cart.
- Checkout using the saved address and Cash on Delivery.
- Show the new order and its tracking status. Cancel a newly confirmed order if desired.
- Log out, sign in as admin, and show dashboard, inventory and order management.

## Changes
- New original dark/lime editorial homepage hero, large typography, CSS device illustrations, pointer tilt, category tabs, previous/next controls, mobile layout, reduced-motion support and keyboard focus styling.
- Existing catalog, search, product rails, cart, checkout and admin screens retained.
- Fixed undefined variable in order merging; fresh server orders are authoritative.
- Cancellation shows success only after server confirmation. Ownership and cancellable states are enforced; repeat cancellation cannot repeatedly restock.
- Removed checkout auto-restocking and automatic fabricated default addresses.
- Validates positive quantities and availability at checkout.
- Prevented automatic re-adding of cached account cart items on every reload.
- Clears customer order/address/cart caches on logout.
- Binds Razorpay verification to the gateway order stored for the actual order.
- Replaced native SQLite addon with built-in Node SQLite for easier installation.
- Added one-origin production serving and PRESENT launchers; included compiled frontend.

## Verification and limits
Passed: production build; API customer/admin login; catalog; add cart; COD order creation; order read; cancellation; repeated cancellation rejected; customer admin access rejected; admin dashboard retrieval.
Browser visual verification was unavailable because the browser binary download failed in the build environment. This is a presentation build, not a complete production/security certification. Existing admin workflows, UPI settlement and live card payments were not fully tested.
Use COD for the demo. UPI requires manual verification and a correctly configured payee; card payments require Razorpay credentials. No real payment was tested or charged.
The reference Palmo site was readable; Spyker could not be fetched. The new design is an original interpretation, not a pixel-exact copy.
Local SQLite persists when run locally. The existing Vercel /tmp database approach is ephemeral and unsuitable for durable hosted orders; use persistent storage before production deployment.

For source edits: cd client, npm ci, npm run dev (backend on 5000), then npm run build to refresh the included production build.
