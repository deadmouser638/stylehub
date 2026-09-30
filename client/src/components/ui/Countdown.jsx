import React, { useEffect, useState } from 'react';

const untilMidnight = () => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return Math.max(0, end - now);
};

// Live countdown to midnight, used for "deal of the day"
const Countdown = ({ className = '' }) => {
  const [ms, setMs] = useState(untilMidnight);

  useEffect(() => {
    const timer = setInterval(() => setMs(untilMidnight()), 1000);
    return () => clearInterval(timer);
  }, []);

  const parts = [
    ['hrs', Math.floor(ms / 3600000)],
    ['min', Math.floor((ms % 3600000) / 60000)],
    ['sec', Math.floor((ms % 60000) / 1000)],
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`} role="timer" aria-label={`Ends in ${parts[0][1]} hours ${parts[1][1]} minutes`}>
      {parts.map(([label, value], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span className="text-lg font-bold opacity-60" aria-hidden="true">:</span>}
          <span className="flex min-w-14 flex-col items-center rounded-xl bg-white/10 px-2 py-1.5 tabular-nums" aria-hidden="true">
            <span className="text-xl font-extrabold leading-none">{String(value).padStart(2, '0')}</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default Countdown;
