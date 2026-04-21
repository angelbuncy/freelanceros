"use client";

import React, { useId, CSSProperties } from "react";

export interface ResponsiveImage {
  src: string;
  alt?: string;
  srcSet?: string;
}

export interface AnimationConfig {
  preview?: boolean;
  scale: number;
  speed: number;
}

export interface NoiseConfig {
  opacity: number;
  scale: number;
}

export interface EtherealShadowProps {
  type?: "preset" | "custom";
  presetIndex?: number;
  customImage?: ResponsiveImage;
  sizing?: "fill" | "stretch";
  /** Tint over the artwork */
  color?: string;
  animation?: AnimationConfig;
  noise?: NoiseConfig;
  style?: CSSProperties;
  className?: string;
  /** Optional center content (e.g. marketing). Dashboard backdrop omits this. */
  children?: React.ReactNode;
  /** Unsplash (or any) image for the soft mask layer */
  maskImageUrl?: string;
  /** Grain / noise texture */
  noiseTextureUrl?: string;
}

function mapRange(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number): number {
  if (fromLow === fromHigh) return toLow;
  const percentage = (value - fromLow) / (fromHigh - fromLow);
  return toLow + percentage * (toHigh - toLow);
}

function useInstanceId(): string {
  const id = useId();
  return `ethereal-${id.replace(/:/g, "")}`;
}

/** Stable Unsplash assets — abstract gradients suitable for overlays */
const DEFAULT_MASK =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";
const DEFAULT_NOISE =
  "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=800&q=80";
const DEFAULT_BACKDROP =
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2400&q=80";

export function EtherealShadow({
  sizing = "fill",
  color = "rgba(16, 24, 40, 0.55)",
  animation,
  noise,
  style,
  className,
  children,
  maskImageUrl = DEFAULT_MASK,
  noiseTextureUrl = DEFAULT_NOISE,
}: EtherealShadowProps) {
  const id = useInstanceId();
  const animationEnabled = Boolean(animation && animation.scale > 0);
  const anim = animation;

  const displacementScale = anim ? mapRange(anim.scale, 1, 100, 12, 48) : 0;
  const baseLo = anim ? mapRange(anim.scale, 0, 100, 0.0012, 0.0006) : 0.001;
  const baseHi = anim ? mapRange(anim.scale, 0, 100, 0.004, 0.002) : 0.003;

  return (
    <div
      className={className}
      style={{
        overflow: "hidden",
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        ...style,
      }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 dark:opacity-35"
        style={{ backgroundImage: `url(${DEFAULT_BACKDROP})` }}
      />
      <div
        style={{
          position: "absolute",
          inset: -displacementScale,
          filter: animationEnabled ? `url(#${id}) blur(3px)` : "blur(2px)",
        }}
      >
        {animationEnabled && (
          <svg className="absolute h-0 w-0" aria-hidden>
            <defs>
              <filter id={id} colorInterpolationFilters="sRGB">
                <feTurbulence
                  result="undulation"
                  numOctaves="2"
                  baseFrequency={`${baseLo},${baseHi}`}
                  seed="2"
                  type="fractalNoise"
                />
                <feDisplacementMap in="SourceGraphic" in2="undulation" scale={displacementScale} />
              </filter>
            </defs>
          </svg>
        )}
        <div
          style={{
            backgroundColor: color,
            maskImage: `url('${maskImageUrl}')`,
            maskSize: sizing === "stretch" ? "100% 100%" : "cover",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      {noise && noise.opacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("${noiseTextureUrl}")`,
            backgroundSize: noise.scale * 200,
            backgroundRepeat: "repeat",
            opacity: noise.opacity / 2,
          }}
        />
      )}

      {children && (
        <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center p-6">{children}</div>
      )}
    </div>
  );
}
