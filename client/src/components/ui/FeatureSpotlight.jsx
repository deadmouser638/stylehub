import React from 'react';
import {
  Zap,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  ScanSearch,
  Headphones,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    badge: 'Express Shipping',
    title: 'Superfast 2-Day Delivery',
    description: 'Free expedited delivery on all orders over ₹499 with live step-by-step courier tracking.',
  },
  {
    icon: ShieldCheck,
    badge: '100% Genuine',
    title: 'Brand Warranty Included',
    description: 'Directly sourced from authorized brand distributors with official manufacturer warranty coverage.',
  },
  {
    icon: RefreshCw,
    badge: 'Hassle Free',
    title: '30-Day Easy Returns',
    description: 'No questions asked returns, instant replacement options, and automated instant refunds.',
  },
  {
    icon: CreditCard,
    badge: 'Encrypted Checkout',
    title: 'Flexible Payment Modes',
    description: 'Pay via instant UPI QR code scanning, credit/debit cards, netbanking, or Cash on Delivery.',
  },
  {
    icon: ScanSearch,
    badge: 'AI Shopping',
    title: 'Visual & Voice Search',
    description: 'Snap a picture of any gadget or speak your query to instantly find exact and matching products.',
  },
  {
    icon: Headphones,
    badge: 'Always Here',
    title: '24/7 Priority Support',
    description: 'Get round-the-clock live chat, email, and phone assistance for order tracking and product support.',
  },
];

/**
 * Crosshair decorative mark inspired by 21st UI components
 */
const CrossDecor = ({ position }) => {
  const isTopStart = position === 'top-start';
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={`pointer-events-none absolute z-10 size-4 text-muted/60 ${
        isTopStart
          ? 'left-0 top-0 -translate-x-1/2 -translate-y-1/2'
          : 'bottom-0 right-0 translate-x-1/2 translate-y-1/2'
      }`}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
};

const FeatureCard = ({ feature }) => {
  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  const Icon = feature.icon;

  return (
    <div
      onPointerMove={handlePointerMove}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-7 shadow-sm transition-all duration-300 hover:border-accent/40 hover:shadow-lg"
    >
      {/* 21st Pointer-follow radial spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(280px_circle_at_var(--mx,_50%)_var(--my,_50%),var(--accent-soft),transparent_70%)]"
      />

      <CrossDecor position="top-start" />
      <CrossDecor position="bottom-end" />

      <div className="relative z-10 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex size-12 items-center justify-center rounded-xl border border-line bg-surface-2 text-accent-text transition-colors duration-300 group-hover:border-accent/30 group-hover:bg-accent group-hover:text-on-accent">
            <Icon className="size-6 stroke-[2]" />
          </div>
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted group-hover:border-accent/30 group-hover:text-accent-text">
            {feature.badge}
          </span>
        </div>

        <div>
          <h3 className="font-display text-xl font-semibold tracking-tight text-fg group-hover:text-accent-text transition-colors duration-200">
            {feature.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function FeatureSpotlight() {
  return (
    <section aria-label="Why Choose ElectroHub" className="container-x py-6">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <span className="eyebrow mb-2 inline-block">The ElectroHub Difference</span>
        <h2 className="section-title">Built for tech lovers who demand excellence</h2>
        <p className="mt-3 text-base text-muted">
          From verified original products to lightning-fast delivery, every purchase is backed by our customer-first commitment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </div>
    </section>
  );
}
