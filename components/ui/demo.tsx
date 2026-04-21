"use client";

import { useState } from "react";
import { MeshGradient, DotOrbit } from "@paper-design/shaders-react";

/**
 * Demo component showcasing @paper-design/shaders-react effects.
 * Adapted to FreelancerOS emerald palette.
 * Not rendered in production — use DynamicBackground in the dashboard layout.
 */
export default function DemoOne() {
  const speed = 0.4;
  const [activeEffect, setActiveEffect] = useState<"mesh" | "dots" | "combined">("mesh");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText("npm i @paper-design/shaders-react");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="w-full h-screen bg-[#04060a] relative overflow-hidden">
      {activeEffect === "mesh" && (
        <MeshGradient
          className="w-full h-full absolute inset-0"
          colors={["#04060a", "#061a10", "#0a2e1a", "#10b981", "#030608"]}
          speed={speed}
          distortion={0.4}
          swirl={0.2}
          grainOverlay={0.03}
        />
      )}

      {activeEffect === "dots" && (
        <div className="w-full h-full absolute inset-0">
          <DotOrbit
            className="w-full h-full"
            colorBack="#04060a"
            colors={["#10b981", "#059669", "#047857"]}
            speed={speed}
            size={0.3}
            spreading={0.6}
          />
        </div>
      )}

      {activeEffect === "combined" && (
        <>
          <MeshGradient
            className="w-full h-full absolute inset-0"
            colors={["#04060a", "#061a10", "#0a2e1a", "#10b981", "#030608"]}
            speed={speed * 0.5}
            distortion={0.5}
          />
          <div className="w-full h-full absolute inset-0 opacity-50">
            <DotOrbit
              className="w-full h-full"
              colorBack="transparent"
              colors={["#10b981", "#059669"]}
              speed={speed * 1.5}
              size={0.2}
              spreading={0.4}
            />
          </div>
        </>
      )}

      {/* Ambient light blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-emerald-900/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Controls overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto">
        {(["mesh", "dots", "combined"] as const).map((e) => (
          <button key={e} onClick={() => setActiveEffect(e)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${activeEffect === e ? "bg-emerald-500 text-black" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
            {e}
          </button>
        ))}
      </div>

      {/* Attribution */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center font-mono text-xs text-white/30">
          <div>FreelancerOS · @paper-design/shaders-react</div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span>npm i @paper-design/shaders-react</span>
            <button onClick={copyToClipboard} className="pointer-events-auto opacity-40 hover:opacity-70 transition-opacity">
              {copied
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
