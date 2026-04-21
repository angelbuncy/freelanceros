'use client';

import React, { useRef, useState, ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96',
};

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  size = 'md',
  width,
  height,
  customSize = false,
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  const getSizeClasses = () => {
    if (customSize) return '';
    return sizeMap[size];
  };

  const inlineStyles: React.CSSProperties = {};
  if (width !== undefined) inlineStyles.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) inlineStyles.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={inlineStyles}
      className={`
        ${getSizeClasses()}
        relative
        rounded-2xl
        bg-white/95 dark:bg-[#0c1410]/95
        border border-gray-200/50 dark:border-emerald-900/20
        shadow-sm dark:shadow-none
        transition-colors duration-300
        group
        ${className}
      `}
    >
      {/* Soft spotlight INNER fill */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 overflow-hidden rounded-2xl"
        style={{
          opacity: opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(52, 211, 153, 0.15), transparent 50%)`,
        }}
      />
      
      {/* Dynamic soft glowing BORDER */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 rounded-2xl"
        style={{
          opacity: opacity,
          background: `radial-gradient(300px circle at ${position.x}px ${position.y}px, rgba(16, 185, 129, 1), transparent 100%)`,
          filter: 'brightness(2)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1.5px', // Border thickness
        }}
      />

      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full p-5 flex flex-col">
        {children}
      </div>


    </div>
  );
};

export { GlowCard };

