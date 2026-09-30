import React from 'react';
import { formatPrice, sellingPrice } from '../../utils/format';

const sizes = {
  sm: ['text-sm', 'text-xs'],
  md: ['text-base', 'text-sm'],
  lg: ['text-3xl', 'text-base'],
};

const Price = ({ product, size = 'sm', className = '' }) => {
  const [main, sub] = sizes[size];
  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      <span className={`${main} font-extrabold text-fg`}>{formatPrice(sellingPrice(product))}</span>
      {product.discount_percent > 0 && (
        <>
          <span className={`${sub} text-muted line-through`}>
            <span className="sr-only">MRP </span>{formatPrice(product.price)}
          </span>
          <span className={`${sub} font-bold text-sale`}>{Math.round(product.discount_percent)}% OFF</span>
        </>
      )}
    </div>
  );
};

export default Price;
