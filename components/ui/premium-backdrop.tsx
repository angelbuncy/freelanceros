"use client";

import { motion } from "framer-motion";

type PremiumBackdropProps = {
  className?: string;
};

export default function PremiumBackdrop({ className }: PremiumBackdropProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.14),transparent_35%),radial-gradient(circle_at_85%_85%,rgba(59,130,246,0.12),transparent_40%)]" />

      <motion.div
        className="absolute -left-20 top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl"
        animate={{ y: [0, 24, -12, 0], x: [0, 10, -8, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-10 top-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl"
        animate={{ y: [0, -18, 18, 0], x: [0, -12, 8, 0], scale: [1, 0.95, 1.05, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-blue-500/12 blur-3xl"
        animate={{ y: [0, -20, 10, 0], x: [0, 16, -10, 0], scale: [1, 1.06, 0.94, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

