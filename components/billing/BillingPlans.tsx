"use client";

import { PricingComponent } from "@/components/ui/pricing-card";

export default function BillingPlans() {
  const plans = [
    {
      id: "starter",
      name: "Starter",
      description: "For trying FreelancerOS with one client",
      price: 199,
      credits: 1,
      isPopular: false,
      buttonLabel: "Buy Starter",
      features: [
        { name: "1 client tracking", isIncluded: true },
        { name: "Email follow-ups every 2 days", isIncluded: true },
        { name: "Unlimited reminders", isIncluded: true },
        { name: "Stops automatically when paid", isIncluded: true },
      ],
    },
    {
      id: "plus",
      name: "Plus",
      description: "Best for active freelancers",
      price: 499,
      credits: 3,
      isPopular: true,
      buttonLabel: "Buy Plus",
      features: [
        { name: "3 clients tracking", isIncluded: true },
        { name: "Email follow-ups every 2 days", isIncluded: true },
        { name: "Unlimited reminders", isIncluded: true },
        { name: "Priority email delivery", isIncluded: true },
      ],
    },
    {
      id: "pro",
      name: "Pro",
      description: "For serious freelancers & agencies",
      price: 1499,
      credits: 10,
      isPopular: false,
      buttonLabel: "Buy Pro",
      features: [
        { name: "10 clients tracking", isIncluded: true },
        { name: "Email follow-ups every 2 days", isIncluded: true },
        { name: "Unlimited reminders", isIncluded: true },
        { name: "Highest delivery priority", isIncluded: true },
      ],
    },
  ];

  function handlePlanSelect(planId: string) {
    console.log("Selected plan:", planId);
    // Razorpay will be wired here next
  }

  return <PricingComponent plans={plans} onPlanSelect={handlePlanSelect} />;
}
