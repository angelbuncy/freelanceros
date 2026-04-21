"use client";

import React, { useRef, useEffect, ReactNode, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { Home } from "lucide-react";

interface StarButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function StarButton({ children, onClick, className }: StarButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.style.setProperty(
      "--path",
      `path('M0 0 H ${el.offsetWidth} V ${el.offsetHeight} H 0 Z')`
    );
  }, []);

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-full px-8 py-4",
        "flex items-center gap-2",
        "bg-white text-black font-medium",
        "hover:bg-emerald-500 hover:text-white",
        "transition-all duration-300 active:scale-95",
        className
      )}
      style={
        {
          "--duration": "3s",
        } as CSSProperties
      }
    >
      <span className="relative z-10 flex items-center gap-2">
        <Home size={18} />
        {children}
      </span>
    </button>
  );
}
