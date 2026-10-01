import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

/**
 * 3D Tilt Card Component from 21st.dev
 * Features:
 * - Dynamic 3D perspective rotation based on pointer position
 * - Physics spring damping with auto-centering on mouse leave
 * - Dynamic sheen/glare lighting overlay
 * - preserve-3d context for inner pop-out elements (translateZ)
 */
export function TiltCard({
  children,
  className = '',
  rotationFactor = 12,
  glare = true,
  scale = 1.02,
  ...props
}) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Raw normalized coordinates: -0.5 to 0.5
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for high-end feel
  const springConfig = { damping: 20, stiffness: 260, mass: 0.5 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  // 3D rotation angles
  const rotateX = useTransform(ySpring, [-0.5, 0.5], [rotationFactor, -rotationFactor]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], [-rotationFactor, rotationFactor]);

  // Glare position percentage
  const glareX = useTransform(xSpring, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(ySpring, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        rotateX,
        rotateY,
        transformPerspective: 1000,
      }}
      whileHover={{ scale }}
      transition={{ duration: 0.2 }}
      className={`relative transition-shadow duration-300 ${className}`}
      {...props}
    >
      {children}

      {/* Dynamic 3D lighting sheen overlay */}
      {glare && isHovered && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-inherit opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-30"
          style={{
            background: useTransform(
              [glareX, glareY],
              ([gx, gy]) =>
                `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 65%)`
            ),
            borderRadius: 'inherit',
          }}
        />
      )}
    </motion.div>
  );
}

export default TiltCard;
