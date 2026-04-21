"use client";

import { ArrowRight, Bitcoin, CircleCheck, ShieldCheck, Sparkles } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PricingFeature {
  text: string;
}

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: string;
  features: PricingFeature[];
  button: {
    text: string;
    url?: string;
  };
}

interface Pricing2Props {
  heading?: string;
  description?: string;
  plans?: PricingPlan[];
  onPlanSelect?: (planId: string) => void;
  loadingPlanId?: string | null;
  disabled?: boolean;
  statusMessage?: string;
  errorMessage?: string;
}

function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-60, 60], [8, -8]), {
    stiffness: 180,
    damping: 20,
    mass: 0.4,
  });
  const rotateY = useSpring(useTransform(x, [-60, 60], [-8, 8]), {
    stiffness: 180,
    damping: 20,
    mass: 0.4,
  });

  return (
    <motion.div
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const Pricing2 = ({
  heading = "Pricing",
  description = "Check out our affordable pricing plans",
  plans = [],
  onPlanSelect,
  loadingPlanId,
  disabled,
  statusMessage,
  errorMessage,
}: Pricing2Props) => {
  return (
    <section className="relative h-full w-full py-2">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.20),transparent_58%)]" />

      <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col justify-center px-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 text-center"
        >
          <h2 className="text-pretty text-2xl font-bold leading-tight text-white lg:text-4xl">{heading}</h2>
          <p className="text-sm text-slate-300 lg:text-base">{description}</p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-emerald-200">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure Razorpay checkout
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-slate-200">
              <Bitcoin className="h-3.5 w-3.5" /> Instant credit activation
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-slate-200">
              <Sparkles className="h-3.5 w-3.5" /> No hidden charges
            </span>
          </div>

          {statusMessage && (
            <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-300">
              {statusMessage}
            </p>
          )}

          {errorMessage && (
            <p className="rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-200">
              {errorMessage}
            </p>
          )}

          <div className="grid w-full max-w-5xl grid-cols-1 justify-items-center gap-3 md:grid-cols-3">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="w-full max-w-sm"
              >
                <TiltCard className="relative">
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute -left-4 -top-4 h-12 w-12 rounded-full bg-emerald-400/20 blur-2xl"
                    animate={{ y: [0, -8, 0], x: [0, 6, 0], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}
                  />
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-4 -right-4 h-10 w-10 rounded-full bg-cyan-400/20 blur-xl"
                    animate={{ y: [0, 7, 0], x: [0, -5, 0], opacity: [0.35, 0.7, 0.35] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: idx * 0.15 + 0.3 }}
                  />

                  <Card className="group flex h-full min-h-[360px] flex-col justify-between border-white/10 bg-white/[0.06] text-left text-white shadow-[0_10px_36px_rgba(0,0,0,0.38)] transition-colors hover:border-emerald-400/55 hover:bg-white/[0.10]">
                    <CardHeader className="p-4">
                      <CardTitle>
                        <p className="text-lg">{plan.name}</p>
                      </CardTitle>
                      <p className="text-xs text-slate-300">{plan.description}</p>
                      <span className="text-3xl font-bold">{plan.monthlyPrice}</span>
                      <p className="text-xs text-slate-400">One-time top-up. Credits never expire.</p>
                    </CardHeader>

                    <CardContent className="p-4 pt-0">
                      <Separator className="mb-3" />
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-xs text-slate-100">
                            <CircleCheck className="size-3.5 text-emerald-300" />
                            <span className="leading-tight">{feature.text}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="mt-auto p-4 pt-0">
                      <Button
                        className="h-9 w-full bg-emerald-500 text-xs text-black hover:bg-emerald-400"
                        onClick={() => {
                          if (onPlanSelect) {
                            onPlanSelect(plan.id);
                            return;
                          }
                          if (plan.button.url) {
                            window.open(plan.button.url, "_blank", "noopener,noreferrer");
                          }
                        }}
                        disabled={disabled}
                      >
                        {loadingPlanId === plan.id ? "Opening payment..." : plan.button.text}
                        <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export { Pricing2 };
