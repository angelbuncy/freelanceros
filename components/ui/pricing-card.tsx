"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";

/* ---------------- TYPES ---------------- */

interface Feature {
  name: string;
  isIncluded: boolean;
}

interface PriceTier {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  isPopular: boolean;
  buttonLabel: string;
  features: Feature[];
}

interface PricingProps {
  plans: PriceTier[];
  onPlanSelect: (planId: string) => void;
}

/* ---------------- COMPONENT ---------------- */

export function PricingComponent({
  plans,
  onPlanSelect,
  className,
}: PricingProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("max-w-7xl mx-auto px-4 py-16", className)}>
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-4xl font-light mb-4">
          Simple pricing. No chasing ever again.
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          One credit = one client.  
          We send polite reminders every 2 days — forever — until you get paid.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "border-white/10 bg-white/5 text-white relative",
              plan.isPopular &&
                "ring-2 ring-emerald-500 scale-[1.03]"
            )}
          >
            {plan.isPopular && (
              <span className="absolute top-4 right-4 text-xs px-3 py-1 rounded-full bg-emerald-500 text-black">
                Most Popular
              </span>
            )}

            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription className="text-slate-400">
                {plan.description}
              </CardDescription>
              <div className="mt-4">
                <p className="text-4xl font-light">
                  ₹{plan.price}
                </p>
                <p className="text-sm text-slate-400">
                  {plan.credits} Credit{plan.credits > 1 ? "s" : ""}
                </p>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3 mt-4">
                {plan.features.map((f) => (
                  <li key={f.name} className="flex gap-3">
                    <Check className="w-4 h-4 text-emerald-400 mt-1" />
                    <span className="text-sm text-slate-300">
                      {f.name}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                onClick={() => onPlanSelect(plan.id)}
                className={cn(
                  "w-full",
                  plan.isPopular
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "bg-white text-black hover:bg-emerald-500"
                )}
              >
                {plan.buttonLabel}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
