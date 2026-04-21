"use client";

import { useRef, useEffect, ReactNode } from "react";

// ── Spotlight border CSS — injected once ─────────────────────────────────────
// Pure CSS approach: no inner div, no stacking context issues.
// The ::before/::after are masked to the border area only via mask-composite.
// Default --x / --y are -9999 so the glow hides offscreen until mouse moves near.

const GLOW_CSS = `
  .fos-card::before,
  .fos-card::after {
    pointer-events: none;
    content: "";
    position: absolute;
    inset: -1.5px;
    border: 1.5px solid transparent;
    border-radius: 17px;
    background-attachment: fixed;
    background-size: calc(100% + 3px) calc(100% + 3px);
    background-repeat: no-repeat;
    background-position: 50% 50%;
    mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
    mask-clip: padding-box, border-box;
    mask-composite: intersect;
    z-index: 0;
  }

  /* Emerald border glow — tracks mouse */
  .fos-card::before {
    background-image: radial-gradient(
      180px 180px at
      calc(var(--mx, -9999) * 1px)
      calc(var(--my, -9999) * 1px),
      rgba(16, 185, 129, 0.85), transparent 100%
    );
    filter: brightness(1.8);
  }

  /* White shimmer on top of the emerald */
  .fos-card::after {
    background-image: radial-gradient(
      120px 120px at
      calc(var(--mx, -9999) * 1px)
      calc(var(--my, -9999) * 1px),
      rgba(255, 255, 255, 0.45), transparent 100%
    );
  }
`;

let glowStyleInjected = false;

// ── Component ────────────────────────────────────────────────────────────────

interface GlowingCardProps {
  children: ReactNode;
  className?: string;
}

export function GlowingCard({ children, className = "" }: GlowingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inject CSS once into document head
    if (!glowStyleInjected && typeof document !== "undefined") {
      const style = document.createElement("style");
      style.textContent = GLOW_CSS;
      document.head.appendChild(style);
      glowStyleInjected = true;
    }

    // Update CSS custom properties on each card as the pointer moves
    const onMove = (e: PointerEvent) => {
      cardRef.current?.style.setProperty("--mx", String(e.clientX));
      cardRef.current?.style.setProperty("--my", String(e.clientY));
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={cardRef}
      className={`fos-card relative rounded-2xl border border-gray-200/60 dark:border-white/[0.07] bg-white/90 dark:bg-[#0d1117]/90 shadow-sm dark:shadow-none backdrop-blur-md p-5 overflow-hidden flex flex-col justify-between gap-4 ${className}`}
    >
      {children}
    </div>
  );
}
