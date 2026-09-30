import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, ArrowRight, Truck, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './ui/Modal';
import Price from './ui/Price';
import { RatingPill } from './ui/RatingStars';
import { UIContext } from '../context/UIContext';
import { CartContext } from '../context/CartContext';
import { WishlistContext } from '../context/WishlistContext';

const QuickViewBody = ({ product, onClose }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(product.sizes.length === 1 ? product.sizes[0] : '');
  const { addToCart } = useContext(CartContext);
  const { wishlist, addToWishlist, removeFromWishlist } = useContext(WishlistContext);
  const isWishlisted = wishlist.some(w => w.product_id === product.id);

  const handleAdd = async () => {
    if (product.sizes.length > 1 && !size) return toast.error('Please select a size');
    if (await addToCart(product.id, size || null, 1)) onClose();
  };

  return (
    <div className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
      <div>
        <div className="overflow-hidden rounded-2xl bg-surface-2">
          <img src={product.images[activeImage]} alt={product.name} className="aspect-[4/5] w-full object-cover" />
        </div>
        <div className="mt-3 flex gap-2">
          {product.images.map((img, i) => (
            <button key={img + i} onClick={() => setActiveImage(i)} className={`overflow-hidden rounded-xl border-2 transition ${activeImage === i ? 'border-fg' : 'border-transparent opacity-70 hover:opacity-100'}`} aria-label={`Show image ${i + 1}`}>
              <img src={img} alt="" className="h-16 w-14 object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <p className="eyebrow">{product.subcategory}</p>
        <h3 className="mt-2 text-xl font-extrabold">{product.brand}</h3>
        <p className="text-muted">{product.name.replace(`${product.brand} `, '')}</p>
        <RatingPill rating={product.rating} count={product.rating_count} className="mt-3 self-start border border-line" />
        <Price product={product} size="md" className="mt-4" />
        <p className="mt-1 text-xs font-semibold text-success">Inclusive of all taxes</p>

        {product.sizes.length > 1 && (
          <div className="mt-5">
            <p className="label">Select size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map(s => (
                <button key={s} onClick={() => setSize(s)} className={`min-w-11 rounded-full border px-3 py-2 text-sm font-bold transition ${size === s ? 'border-fg bg-ink text-on-ink' : 'border-line-strong hover:border-fg'}`} aria-pressed={size === s}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={handleAdd} disabled={product.stock === 0} className="btn-primary flex-1">
            <ShoppingBag size={18} /> {product.stock === 0 ? 'Out of stock' : 'Add to bag'}
          </button>
          <button
            onClick={() => (isWishlisted ? removeFromWishlist(product.id) : addToWishlist(product.id))}
            className="btn-outline px-4"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart size={18} className={isWishlisted ? 'fill-accent text-accent' : ''} />
          </button>
        </div>

        <ul className="mt-6 space-y-2 text-sm text-muted">
          <li className="flex items-center gap-2"><Truck size={16} /> Free delivery on orders above ₹999</li>
          <li className="flex items-center gap-2"><RotateCcw size={16} /> {product.specs?.Warranty || 'Brand warranty'} · 7-day replacement</li>
        </ul>

        <Link to={`/product/${product.id}`} onClick={onClose} className="link mt-auto inline-flex items-center gap-1 pt-6 text-sm">
          View full details <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
};

const QuickViewModal = () => {
  const { quickViewProduct, closeQuickView } = useContext(UIContext);
  return (
    <Modal open={!!quickViewProduct} onClose={closeQuickView} title="Quick view" variant="wide">
      {quickViewProduct && <QuickViewBody key={quickViewProduct.id} product={quickViewProduct} onClose={closeQuickView} />}
    </Modal>
  );
};

export default QuickViewModal;
