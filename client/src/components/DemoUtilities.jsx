import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, HelpCircle } from 'lucide-react';

export default function DemoUtilities() {
  const [choice, setChoice] = useState(() => localStorage.getItem('electrohub_cookie_choice'));
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (choice !== 'all') return;
    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign'].flatMap(key => {
      const value = params.get(key);
      return value && /^[\w .-]{1,80}$/.test(value) ? [[key, value]] : [];
    }));
    if (Object.keys(utm).length) sessionStorage.setItem('electrohub_utm', JSON.stringify(utm));
  }, [choice]);

  const save = value => {
    localStorage.setItem('electrohub_cookie_choice', value);
    if (value !== 'all') sessionStorage.removeItem('electrohub_utm');
    setChoice(value);
  };

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2.5 md:bottom-6 md:right-6">
        {showBackToTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-fg shadow-lg transition hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Back to top"
          >
            <ArrowUp size={19} />
          </button>
        )}

        <Link
          to="/help/faq"
          className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-on-ink shadow-lg transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Open help and FAQ"
        >
          <HelpCircle size={16} /> Help & FAQ
        </Link>
      </div>

      {/* Cookie Notice Banner */}
      {!choice && (
        <div
          role="dialog"
          aria-label="Privacy and cookie choices"
          className="fixed bottom-20 left-4 right-4 z-50 max-w-md rounded-2xl border border-line bg-surface p-4 shadow-2xl transition animate-slide-up md:bottom-6 md:left-6"
        >
          <p className="text-sm font-bold">Demo Privacy Notice</p>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            ElectroHub is a demonstration storefront. We use local browser storage and session cookies to provide cart, theme and checkout simulations. No real marketing data or personal tracking is collected.
          </p>
          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              className="btn-outline px-3.5 py-1.5 text-xs"
              onClick={() => save('necessary')}
            >
              Essential only
            </button>
            <button
              type="button"
              className="btn-primary px-3.5 py-1.5 text-xs"
              onClick={() => save('all')}
            >
              Accept demo cookies
            </button>
          </div>
        </div>
      )}
    </>
  );
}
