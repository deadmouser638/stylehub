import React from 'react';
import { Star } from 'lucide-react';

// Compact rating pill, e.g. "4.3 ★ | 352"
export const RatingPill = ({ rating, count, className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-bold text-fg backdrop-blur ${className}`}>
    {Number(rating).toFixed(1)}
    <Star size={11} className="fill-star text-star" aria-hidden="true" />
    {count !== undefined && <span className="border-l border-line-strong pl-1 font-semibold text-muted">{Number(count) >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}</span>}
    <span className="sr-only"> out of 5 stars{count !== undefined ? ` from ${count} ratings` : ''}</span>
  </span>
);

// Row of five stars (supports read-only display and picking a rating)
export const StarRow = ({ value, size = 16, onChange }) => (
  <div className="flex items-center gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label={onChange ? 'Your rating' : `${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(n => {
      const filled = n <= Math.round(value);
      const star = <Star size={size} className={filled ? 'fill-star text-star' : 'text-line-strong'} aria-hidden="true" />;
      return onChange ? (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="rounded p-0.5 transition hover:scale-110">
          {star}
        </button>
      ) : <span key={n}>{star}</span>;
    })}
  </div>
);

export default RatingPill;
