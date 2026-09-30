import React from 'react';

export const ProductCardSkeleton = () => (
  <div aria-hidden="true">
    <div className="skeleton aspect-[3/4] w-full rounded-2xl" />
    <div className="mt-3 space-y-2 px-1">
      <div className="skeleton h-4 w-1/2 rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
      <div className="skeleton h-4 w-2/5 rounded" />
    </div>
  </div>
);

export const ProductGridSkeleton = ({ count = 8, className = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4' }) => (
  <div className={className} role="status" aria-label="Loading products">
    {Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}
  </div>
);

export const Spinner = ({ className = '' }) => (
  <div className={`flex min-h-[50vh] items-center justify-center ${className}`} role="status" aria-label="Loading">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
  </div>
);
