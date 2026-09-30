import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { UIContext } from '../context/UIContext';

const NotFound = () => {
  const { openSearch } = useContext(UIContext);
  return (
    <div className="container-x flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-[9rem] font-semibold leading-none text-surface-3 md:text-[12rem]" aria-hidden="true">404</p>
      <h1 className="-mt-4 font-display text-3xl font-semibold md:text-4xl">This page went out of stock</h1>
      <p className="mt-3 max-w-md text-muted">The page you're looking for may have moved or no longer exists. Let's get you back to shopping.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">Back to home <ArrowRight size={16} /></Link>
        <button onClick={openSearch} className="btn-outline"><Search size={16} /> Search products</button>
      </div>
    </div>
  );
};

export default NotFound;
