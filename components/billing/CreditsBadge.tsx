"use client";

import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface CreditsBadgeProps {
  credits: number;
}

export default function CreditsBadge({ credits }: CreditsBadgeProps) {
  return (
    <Badge
      variant="default"
      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20 text-[11px]"
    >
      <Zap size={10} className="opacity-80" />
      <span className="font-medium">{credits} Credits</span>
    </Badge>
  );
}
