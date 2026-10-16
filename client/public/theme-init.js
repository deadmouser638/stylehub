try {
  const saved = localStorage.getItem('theme') || 'system';
  const dark = saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
} catch { /* Browser storage may be unavailable. */ }
