import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function DemoUtilities() {
  const [choice, setChoice] = useState(() => localStorage.getItem('electrohub_cookie_choice'));
  useEffect(() => {
    if (choice !== 'all') return;
    // Keep attribution in this browser session only. No external analytics call.
    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign'].flatMap(key => {
      const value = params.get(key);
      return value && /^[\w .-]{1,80}$/.test(value) ? [[key, value]] : [];
    }));
    if (Object.keys(utm).length) sessionStorage.setItem('electrohub_utm', JSON.stringify(utm));
  }, [choice]);
  const save = value => { localStorage.setItem('electrohub_cookie_choice', value); if (value !== 'all') sessionStorage.removeItem('electrohub_utm'); setChoice(value); };
  return <>
    <Link to="/help/contact" className="fixed bottom-24 right-4 z-40 rounded-full bg-ink px-4 py-3 text-xs font-bold text-on-ink shadow-lg hover:opacity-90 md:bottom-5" aria-label="Open help centre">Help</Link>
    {!choice && <div role="dialog" aria-label="Cookie preference" className="fixed bottom-20 left-4 right-4 z-50 max-w-md rounded-2xl border border-line bg-surface p-4 shadow-xl md:bottom-5">
      <p className="text-sm font-bold">Demo privacy choice</p>
      <p className="mt-1 text-xs text-muted">This demo uses browser storage for your cart, theme and preference. Optional attribution is kept in this browser session.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-outline px-4 py-2 text-xs" onClick={() => save('necessary')}>Necessary only</button>
        <button type="button" className="btn-primary px-4 py-2 text-xs" onClick={() => save('all')}>Accept</button>
      </div>
    </div>}
  </>;
}
