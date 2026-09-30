import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, RotateCcw, ShieldCheck, Headset, Send, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { CatalogContext, categoryPath } from '../context/CatalogContext';

const PERKS = [
  { icon: Truck, title: 'Free delivery', text: 'On all orders above ₹999' },
  { icon: RotateCcw, title: '7-day replacement', text: 'For damaged or defective items' },
  { icon: ShieldCheck, title: 'Brand warranty', text: 'Genuine products, GST invoice' },
  { icon: Headset, title: '24x7 support', text: 'We are here to help' },
];

const HELP_LINKS = [
  ['Contact us', '/help/contact'],
  ['FAQs', '/help/faq'],
  ['Shipping', '/help/shipping'],
  ['Returns & exchanges', '/help/returns'],
  ['Track your order', '/track'],
  ['Terms of use', '/help/terms'],
  ['Privacy policy', '/help/privacy'],
];

const Footer = () => {
  const { categories } = useContext(CatalogContext);
  const [email, setEmail] = useState('');

  const subscribe = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error('Please enter a valid email address');
    toast.success("You're subscribed! Watch your inbox for exclusive drops.");
    setEmail('');
  };

  return (
    <footer className="mt-20 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="container-x grid grid-cols-2 gap-6 border-b border-line py-10 lg:grid-cols-4">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-fg"><Icon size={22} /></span>
            <div>
              <p className="text-sm font-extrabold">{title}</p>
              <p className="text-xs text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div>
          <Link to="/" className="font-display text-3xl font-bold">Electro<span className="text-accent-text">Hub.</span></Link>
          <p className="mt-4 max-w-xs text-sm text-muted">Phones, laptops, TVs, cameras and home appliances with full specifications, brand warranty and fast delivery.</p>
        </div>

        <div>
          <h3 className="label mb-4">Shop</h3>
          <ul className="space-y-2.5">
            {categories.map(c => (
              <li key={c.name}><Link to={categoryPath(c.name)} className="text-sm font-semibold text-fg hover:text-accent-text">{c.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="label mb-4">Help</h3>
          <ul className="space-y-2.5">
            {HELP_LINKS.map(([label, to]) => (
              <li key={to}><Link to={to} className="text-sm font-semibold text-fg hover:text-accent-text">{label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="label mb-4">Get exclusive drops</h3>
          <p className="mb-4 text-sm text-muted">Early access to sales and new arrivals. No spam, unsubscribe anytime.</p>
          <form onSubmit={subscribe} className="flex gap-2">
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <div className="relative flex-1">
              <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input id="newsletter-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input rounded-full pl-10" />
            </div>
            <button type="submit" className="btn-primary px-4" aria-label="Subscribe"><Send size={18} /></button>
          </form>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} ElectroHub. All rights reserved.</p>
          <p>Product photos from Unsplash. Payments are simulated in this demo store.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
