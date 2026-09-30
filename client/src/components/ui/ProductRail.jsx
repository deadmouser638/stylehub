import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from './Skeletons';

/** Horizontally scrolling row of products with snap points and arrow controls */
const ProductRail = ({ title, eyebrow, products, loading, viewAllTo, action, toolbar, className = '' }) => {
  const trackRef = useRef(null);

  const scroll = (dir) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (!loading && products.length === 0 && !toolbar) return null;

  return (
    <section className={className} aria-label={title}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {viewAllTo && (
            <Link to={viewAllTo} className="hidden items-center gap-1 text-sm font-bold text-fg hover:text-accent-text sm:inline-flex">
              View all <ArrowRight size={16} />
            </Link>
          )}
          <div className="hidden gap-2 md:flex">
            <button onClick={() => scroll(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-surface transition hover:border-fg" aria-label="Scroll left">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => scroll(1)} className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-surface transition hover:border-fg" aria-label="Scroll right">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {toolbar && <div className="mb-5">{toolbar}</div>}

      <div ref={trackRef} className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0">
        {loading
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%] xl:w-[18.5%]"><ProductCardSkeleton /></div>
            ))
          : products.map(p => (
              <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%] xl:w-[18.5%]">
                <ProductCard product={p} />
              </div>
            ))}
      </div>

      {viewAllTo && (
        <Link to={viewAllTo} className="btn-outline mt-6 w-full sm:hidden">
          View all <ArrowRight size={16} />
        </Link>
      )}
    </section>
  );
};

export default ProductRail;
