import React from 'react';
import { motion } from 'motion/react';

const VARIANTS = {
  'fade-up': {
    hidden: { opacity: 0, y: 35, filter: 'blur(6px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)' },
  },
  'fade-down': {
    hidden: { opacity: 0, y: -35, filter: 'blur(6px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)' },
  },
  'fade-left': {
    hidden: { opacity: 0, x: -35, filter: 'blur(6px)' },
    show: { opacity: 1, x: 0, filter: 'blur(0px)' },
  },
  'fade-right': {
    hidden: { opacity: 0, x: 35, filter: 'blur(6px)' },
    show: { opacity: 1, x: 0, filter: 'blur(0px)' },
  },
  'scale-up': {
    hidden: { opacity: 0, scale: 0.92, filter: 'blur(8px)' },
    show: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  },
  'blur-in': {
    hidden: { opacity: 0, filter: 'blur(12px)' },
    show: { opacity: 1, filter: 'blur(0px)' },
  },
};

/**
 * ScrollReveal Component from 21st.dev
 * Automatically fades and un-blurs elements as they enter the viewport
 */
export function ScrollReveal({
  children,
  className = '',
  index = 0,
  variant = 'fade-up',
  duration = 0.55,
  delay = 0,
  once = true,
  amount = 0.15,
  ...props
}) {
  const chosenVariant = VARIANTS[variant] || VARIANTS['fade-up'];
  const totalDelay = delay + (index > 0 ? index * 0.08 : 0);

  return (
    <motion.div
      variants={chosenVariant}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      transition={{
        duration,
        delay: totalDelay,
        ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for smooth deceleration
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default ScrollReveal;
