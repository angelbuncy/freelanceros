"use client";

import React, { useEffect, useRef } from "react";

export default function DigitalSerenity() {
  const glowRef = useRef<HTMLDivElement | null>(null);
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
    };

    let rafId = 0;
    const animate = () => {
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.03;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.03;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideCTA {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .word {
          opacity: 0;
          animation: fadeUp 1.8s ease forwards;
        }

        .d1 { animation-delay: 0.6s; }
        .d2 { animation-delay: 1.2s; }
        .d3 { animation-delay: 1.9s; }
        .d4 { animation-delay: 2.6s; }

        .grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .cta-btn {
          background: white;
          color: black;
          transition: all 0.6s ease;
        }

        .cta-btn:hover {
          background: #10b981;
          box-shadow: 0 0 45px rgba(16,185,129,0.55);
        }
      `}</style>

      <div className="relative min-h-screen bg-black text-white overflow-hidden grid">
        <div
          ref={glowRef}
          className="pointer-events-none fixed top-0 left-0 w-[420px] h-[420px] rounded-full blur-3xl opacity-40"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)",
            transform: "translate(-50%, -50%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6">
          <p className="uppercase tracking-[0.32em] text-xs text-slate-400 mb-8 word d1">
            AUTOMATED PAYMENT FOLLOW-UPS
          </p>

          <h1 className="text-4xl md:text-6xl font-light leading-tight mb-6">
            <span className="block word d2">Stop chasing clients.</span>
            <span className="block text-slate-300 word d3">Get paid without reminders.</span>
          </h1>

          <p className="max-w-2xl text-lg text-slate-400 mb-16 word d4">
            FreelancerOS sends calm, professional follow-ups for unpaid invoices - until the payment is done.
            <br />
            No awkward messages. No stress. No chasing.
          </p>

          <div
            className="opacity-0"
            style={{ animation: "slideCTA 1.6s ease forwards", animationDelay: "3.6s" }}
          >
            <a href="/auth" className="cta-btn px-12 py-4 rounded-2xl text-lg font-medium">
              Add first client - FREE -&gt;
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
