import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { WishlistContext } from '../context/WishlistContext';
import Price from '../components/ui/Price';

const Wishlist = () => {
  const { wishlist, removeFromWishlist, moveToCart } = useContext(WishlistContext);
  const [sizePickerFor, setSizePickerFor] = useState(null);

  const handleMoveToBag = (item) => {
    if (item.sizes.length > 1) setSizePickerFor(sizePickerFor === item.product_id ? null : item.product_id);
    else moveToCart(item.product_id, item.sizes[0]);
  };

  if (wishlist.length === 0) {
    return (
      <div className="container-x py-12">
        <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-14 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-accent-soft text-accent-text"><Heart size={36} /></span>
          <h1 className="mt-6 font-display text-3xl font-semibold">Your wishlist is empty</h1>
          <p className="mt-2 max-w-sm text-muted">Tap the heart on anything you love to save it here, then move it to your bag when you're ready.</p>
          <Link to="/products" className="btn-primary mt-7">Discover products <ArrowRight size={16} /></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8 md:py-12">
      <h1 className="mb-8 font-display text-3xl font-semibold md:text-4xl">Wishlist <span className="font-sans text-lg font-semibold text-muted">({wishlist.length} {wishlist.length === 1 ? 'item' : 'items'})</span></h1>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {wishlist.map(item => (
          <article key={item.id} className="group flex flex-col">
            <div className="relative overflow-hidden rounded-2xl bg-surface-2">
              <Link to={`/product/${item.product_id}`} className="block aspect-[3/4]">
                <img src={item.images[0]} alt={item.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
              </Link>
              <button onClick={() => removeFromWishlist(item.product_id)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-surface/90 text-fg shadow-card backdrop-blur transition hover:scale-110" aria-label={`Remove ${item.name} from wishlist`}>
                <X size={17} />
              </button>
              {item.stock === 0 && <span className="absolute inset-x-3 bottom-3 rounded-full bg-surface/95 py-1.5 text-center text-xs font-extrabold text-muted">Out of stock</span>}
              {item.stock > 0 && item.stock <= 5 && <span className="absolute inset-x-3 bottom-3 rounded-full bg-surface/95 py-1.5 text-center text-xs font-extrabold text-danger">Only {item.stock} left!</span>}
            </div>

            <div className="mt-3 flex flex-1 flex-col px-0.5">
              <p className="truncate text-sm font-extrabold">{item.brand}</p>
              <p className="mb-1.5 truncate text-sm text-muted">{item.name.replace(`${item.brand} `, '')}</p>
              <Price product={item} />

              {sizePickerFor === item.product_id && (
                <div className="mt-3 animate-fade-in">
                  <p className="label">Select size</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.sizes.map(size => (
                      <button key={size} onClick={() => { moveToCart(item.product_id, size); setSizePickerFor(null); }} className="min-w-9 rounded-full border border-line-strong px-2.5 py-1.5 text-xs font-bold transition hover:border-fg hover:bg-ink hover:text-on-ink">
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => handleMoveToBag(item)} disabled={item.stock === 0} className="btn-outline mt-3 w-full py-2.5 text-xs">
                <ShoppingBag size={15} /> {sizePickerFor === item.product_id ? 'Cancel' : 'Move to bag'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
