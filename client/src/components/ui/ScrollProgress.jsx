import React from 'react';
import { motion, useScroll, useSpring } from 'motion/react';

export function ScrollProgress({ className = '' }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 25,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className={`fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-emerald-400 origin-left z-50 pointer-events-none ${className}`}
      style={{ scaleX }}
    />
  );
}

export default ScrollProgress;
