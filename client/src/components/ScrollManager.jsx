import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';

// Scrolls to the top on page changes and shows a floating "back to top" button on long pages
const ScrollManager = () => {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 900);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-ink text-on-ink shadow-float transition hover:scale-105 animate-fade-in md:bottom-8 md:right-8"
      aria-label="Back to top"
    >
      <ArrowUp size={20} />
    </button>
  );
};

export default ScrollManager;
