import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Eye } from 'lucide-react';
import { RatingPill } from './RatingStars';
import Price from './Price';
import { WishlistContext } from '../../context/WishlistContext';
import { AuthContext } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';
import { COLOR_SWATCHES } from '../../utils/format';

// A few headline specs per product type, e.g. "8 GB · 256 GB · 5000 mAh"
const KEY_SPECS = ['RAM', 'Storage', 'Processor', 'Screen Size', 'Resolution', 'Capacity', 'Energy Rating', 'Type', 'Sensor', 'Video', 'Battery'];
export const keySpecs = (product) => KEY_SPECS.map(k => product.specs?.[k]).filter(Boolean).slice(0, 3);

const ProductCard = ({ product, className = '' }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const { wishlist, addToWishlist, removeFromWishlist } = useContext(WishlistContext);
  const { user } = useContext(AuthContext);
  const { openQuickView } = useContext(UIContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isWishlisted = wishlist.some(item => item.product_id === product.id);
  const [primary, secondary] = product.images;
  const title = product.name.replace(`${product.brand} `, '');

  const handleWishlistClick = (e) => {
    e.preventDefault();
    if (!user) return navigate('/login', { state: { from: location.pathname + location.search } });
    if (isWishlisted) removeFromWishlist(product.id);
    else addToWishlist(product.id);
  };

  return (
    <article className={`group relative flex flex-col ${className}`}>
      <div className="relative overflow-hidden rounded-2xl bg-surface-2">
        <Link to={`/product/${product.id}`} className="block aspect-[3/4]" aria-label={`${product.brand} ${title}`}>
          {!imgLoaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}
          <img
            src={primary}
            alt={title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition duration-700 group-hover:scale-[1.04] ${secondary ? 'group-hover:opacity-0' : ''}`}
          />
          {secondary && (
            <img src={secondary} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-100" />
          )}
        </Link>

        {product.stock > 0 && product.stock <= 5 ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-surface px-2.5 py-1 text-[11px] font-extrabold text-danger">
            Only {product.stock} left
          </span>
        ) : product.discount_percent >= 40 && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-on-accent">
            {Math.round(product.discount_percent)}% off
          </span>
        )}

        <button
          onClick={handleWishlistClick}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-surface/90 text-fg shadow-card backdrop-blur transition hover:scale-110"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted}
        >
          <Heart size={17} className={isWishlisted ? 'fill-accent text-accent' : ''} />
        </button>

        <RatingPill rating={product.rating} count={product.rating_count} className="pointer-events-none absolute bottom-3 left-3 transition group-hover:opacity-0" />

        <button
          onClick={() => openQuickView(product)}
          className="absolute inset-x-3 bottom-3 hidden translate-y-3 items-center justify-center gap-2 rounded-full bg-surface/95 py-2.5 text-sm font-bold text-fg opacity-0 shadow-card backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 md:flex"
        >
          <Eye size={16} /> Quick view
        </button>
      </div>

      <Link to={`/product/${product.id}`} className="mt-3 flex flex-1 flex-col px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-extrabold text-fg">{product.brand}</h3>
          {product.colors?.length > 0 && (
            <div className="flex shrink-0 -space-x-1 pt-0.5" aria-label={`Colours: ${product.colors.join(', ')}`}>
              {product.colors.slice(0, 3).map(c => (
                <span key={c} title={c} className="h-3.5 w-3.5 rounded-full border border-line-strong" style={{ background: COLOR_SWATCHES[c] || c }} />
              ))}
            </div>
          )}
        </div>
        <p className="truncate text-sm text-muted">{title}</p>
        {keySpecs(product).length > 0 && <p className="mb-1.5 mt-0.5 truncate text-xs font-semibold text-muted">{keySpecs(product).join(' · ')}</p>}
        <Price product={product} className="mt-auto" />
      </Link>
    </article>
  );
};

export default ProductCard;
