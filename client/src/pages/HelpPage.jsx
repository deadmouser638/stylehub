import React from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import NotFound from './NotFound';

const PAGES = {
  contact: {
    title: 'Contact us',
    body: [
      ['Demo support', 'This is a demonstration store. The contact details and order records are examples; please contact the project owner through the repository for project questions.'],
      ['Demo orders', 'Orders exist only in your browser session and are not handled by a support team. Use the confirmation link within 24 hours to preview tracking.'],
      ['About this project', 'ElectroHub is a demo project, not a registered retailer. No product is shipped and no payment is collected.'],
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    body: [
      ['How do I compare specifications?', 'Open any category and use the Specifications filters (RAM, storage, screen size, capacity, energy rating and more) to narrow down products. Every product page lists its full specifications.'],
      ['How do I track my order?', 'Use the 24-hour demo tracking link on your confirmation, or enter the order number in Track order while using the same browser session. No real shipment is tracked.'],
      ['How do I search with a photo?', 'Tap the camera icon in the search bar. Take a photo or choose one from your gallery, and ElectroHub recognises the product type and shows similar models. The photo is analysed on your device and never uploaded.'],
      ['How do coupons work?', 'Enter a code such as WELCOME10 in your bag. The discount is checked against your bag total and applied at checkout.'],
      ['Can I cancel an order?', 'Yes. Orders that have not shipped yet can be cancelled from My Orders.'],
      ['Is cash on delivery available?', 'Yes, you can pick Cash on Delivery at checkout.'],
      ['How do I switch to dark mode?', 'Use the moon/sun icon in the header, or choose Light, Dark or System under Profile → Appearance.'],
    ],
  },
  shipping: {
    title: 'Shipping',
    body: [
      ['Delivery preview', 'The sample estimate shows 3–5 business days (up to 7 for remote areas). Demo orders are not shipped.'],
      ['Sample delivery charges', 'The demo calculation is free above ₹999 and ₹99 for smaller orders. No delivery charge is collected.'],
      ['Check your pincode', 'Enter your pincode on any product page to see the expected delivery date.'],
    ],
  },
  returns: {
    title: 'Returns & exchanges',
    body: [
      ['7-day replacement example', 'The sample policy covers damaged, defective or wrong items within 7 days. No real returns are processed.'],
      ['Warranty examples', 'Warranty details are sample catalog data, not an offer of manufacturer warranty.'],
      ['Installation', 'Installation is not provided for demo orders.'],
      ['Refunds', 'No money is collected, so there are no refunds in this demo.'],
    ],
  },
  terms: {
    title: 'Terms of use',
    body: [
      ['Demo store', 'ElectroHub is a demonstration store. No real payments are taken and no products are shipped.'],
      ['Accounts', 'You are responsible for keeping your password safe and for activity on your account.'],
      ['Pricing', 'Prices and offers can change without notice. The price at the time of order is the price you pay.'],
    ],
  },
  privacy: {
    title: 'Privacy policy',
    body: [
      ['What we store', 'Demo accounts, addresses and orders are saved to the demo database and some browser storage. Do not enter real personal information.'],
      ['Photos for visual search', 'Photos you use to search are processed in your browser and are never uploaded to our servers.'],
      ['On your device', 'Your theme choice, recent searches and recently viewed products are stored only in your browser.'],
    ],
  },
};

const HelpPage = () => {
  const { slug } = useParams();
  const page = PAGES[slug];
  if (!page) return <NotFound />;

  return (
    <div className="container-x grid gap-10 py-10 md:grid-cols-[220px_1fr] md:py-14">
      <aside className="min-w-0">
        <p className="label mb-3">Help centre</p>
        <nav className="flex gap-2 overflow-x-auto hide-scrollbar md:flex-col md:gap-1">
          {Object.entries(PAGES).map(([key, p]) => (
            <NavLink key={key} to={`/help/${key}`} className={({ isActive }) => `shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition ${isActive ? 'bg-ink text-on-ink' : 'text-fg hover:bg-surface-2'}`}>
              {p.title}
            </NavLink>
          ))}
        </nav>
      </aside>
      <article className="min-w-0 max-w-2xl">
        <h1 className="section-title">{page.title}</h1>
        <div className="mt-8 space-y-4">
          {page.body.map(([heading, text]) => slug === 'faq' ? (
            <details key={heading} className="card group p-5">
              <summary className="cursor-pointer font-extrabold">{heading}</summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </details>
          ) : (
            <section key={heading} className="card p-5">
              <h2 className="font-extrabold">{heading}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </section>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted">Last updated: 16 October 2026</p>
        <p className="mt-8 text-sm text-muted">Still need help? <Link to="/help/contact" className="link">Contact us</Link>.</p>
      </article>
    </div>
  );
};

export default HelpPage;
