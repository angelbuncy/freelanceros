'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type DockItem = {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
};

type DockProps = {
  items: DockItem[];
};

export default function Dock({ items }: DockProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-end gap-4 rounded-2xl bg-white/90 backdrop-blur-md px-6 py-3 shadow-xl">
        {items.map((item, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.25, y: -6 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            onClick={item.onClick}
            className={cn(
              'relative flex h-12 w-12 items-center justify-center rounded-full',
              'bg-black text-white'
            )}
          >
            {item.icon}

            {/* Tooltip */}
            <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
              {item.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
