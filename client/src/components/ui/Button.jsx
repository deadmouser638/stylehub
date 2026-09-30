import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "font-bold text-sm tracking-wide rounded-sm transition-all duration-200 flex items-center justify-center uppercase px-6 py-3";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primaryDark shadow-md hover:shadow-lg",
    secondary: "bg-white text-gray-800 border border-gray-300 hover:border-gray-800",
    outline: "bg-transparent text-primary border border-primary hover:bg-primary hover:text-white"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
