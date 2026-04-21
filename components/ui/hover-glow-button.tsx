"use client";

import React, { useRef, useState, MouseEvent, ReactNode } from "react";

interface HoverButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  glowColor?: string;
  backgroundColor?: string;
  textColor?: string;
  hoverTextColor?: string;
}

export function HoverGlowButton({
  children,
  onClick,
  className = "",
  disabled = false,
  glowColor = "#10b981",
  backgroundColor = "#000000",
  textColor = "#ffffff",
  hoverTextColor = "#10b981",
}: HoverButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hover, setHover] = useState(false);

  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`
        relative overflow-hidden rounded-2xl px-8 py-4
        text-lg font-medium transition-colors
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      style={{
        backgroundColor,
        color: hover ? hoverTextColor : textColor,
      }}
    >
      <span
        className={`
          pointer-events-none absolute -translate-x-1/2 -translate-y-1/2
          rounded-full transition-all duration-500
          ${hover ? "opacity-60 scale-100" : "opacity-0 scale-0"}
        `}
        style={{
          left: pos.x,
          top: pos.y,
          width: 220,
          height: 220,
          background: `radial-gradient(circle, ${glowColor} 10%, transparent 70%)`,
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
