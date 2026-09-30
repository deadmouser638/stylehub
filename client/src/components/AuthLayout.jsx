import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, RotateCcw, ScanSearch } from 'lucide-react';

const AuthLayout = ({ image, heading, subheading, children }) => (
  <div className="container-x py-8 md:py-14">
    <div className="card mx-auto grid max-w-5xl overflow-hidden shadow-float md:grid-cols-2">
      <div className="relative hidden min-h-[560px] md:block">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <Link to="/" className="font-display text-2xl font-bold">ElectroHub.</Link>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-tight">{heading}</h2>
          <p className="mt-2 text-white/85">{subheading}</p>
          <ul className="mt-8 space-y-2.5 text-sm font-semibold">
            <li className="flex items-center gap-2"><Truck size={16} /> Free delivery above ₹999</li>
            <li className="flex items-center gap-2"><RotateCcw size={16} /> Brand warranty & 7-day replacement</li>
            <li className="flex items-center gap-2"><ScanSearch size={16} /> Shop with a photo</li>
          </ul>
        </div>
      </div>
      <div className="p-7 sm:p-10 md:p-12">{children}</div>
    </div>
  </div>
);

export default AuthLayout;
