"use client";

import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

// ── Dark mode colors (STAYING UNTOUCHED) ──────────────────────────────────────
const DARK_COLORS = ["#04060a", "#061a10", "#0a2e1a", "#10b981", "#030608"];

// ── Light mode colors (NEW MESHGRADIENT LOOK) ─────────────────────────────────
const LIGHT_COLORS = ["#000000", "#10b981", "#ffffff", "#064e3b", "#065f46"];
const LIGHT_WIREFRAME = ["#000000", "#ffffff", "#10b981", "#000000"];

export function DynamicBackground() {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : true
  );

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  if (isDark) {
    return (
      <MeshGradient
        key="dark-mesh"
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
        colors={DARK_COLORS}
        speed={0.35}
        distortion={0.35}
        swirl={0.15}
        grainOverlay={0.04}
      />
    );
  }

  // Light Mode: Dual MeshGradient logic (replacing Three.js)
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
      <MeshGradient
        key="light-mesh-base"
        className="absolute inset-0 w-full h-full"
        colors={LIGHT_COLORS}
        speed={0.3}
      />
      <MeshGradient
        key="light-mesh-wire"
        className="absolute inset-0 w-full h-full opacity-40"
        colors={LIGHT_WIREFRAME}
        speed={0.2}
      />
      
      {/* SVG Filters for glass/gooey effects IF needed globally, otherwise kept in hero-shader */}
      <svg className="absolute inset-0 w-0 h-0">
        <defs>
          <filter id="bg-glass" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

export function ShaderBackground() {
  return <DynamicBackground />;
}
