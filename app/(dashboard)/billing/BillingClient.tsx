"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { loadRazorpay } from "@/lib/razorpay";
import { Pricing2 } from "@/components/ui/pricing2";
import { AnimatePresence, motion } from "framer-motion";
import { Bitcoin, CheckCircle2 } from "lucide-react";

declare global {
  interface RazorpayCheckout { open: () => void; }
  interface RazorpayConstructor { new (options: RazorpayOptions): RazorpayCheckout; }
  interface RazorpayOptions {
    key: string; amount: number; currency: string; name: string;
    description: string; order_id: string;
    handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string; }) => void | Promise<void>;
    modal?: { ondismiss?: () => void; };
  }
  interface Window { Razorpay?: RazorpayConstructor; }
}

const plans = [
  { id: "starter", name: "Starter", description: "One client follow-up system", monthlyPrice: "INR 199", credits: 1, amount: 199,
    features: [{ text: "1 client tracking" }, { text: "Polite reminders every 2 days" }, { text: "Stops automatically when paid" }, { text: "No awkward follow-up messages" }],
    button: { text: "Buy 1 Credit(s) - INR 199" } },
  { id: "plus", name: "Plus", description: "Best for active freelancers", monthlyPrice: "INR 499", credits: 3, amount: 499,
    features: [{ text: "3 client tracking slots" }, { text: "Polite reminders every 2 days" }, { text: "Stops automatically when paid" }, { text: "Manual control always available" }],
    button: { text: "Buy 3 Credit(s) - INR 499" } },
  { id: "pro", name: "Pro", description: "For serious freelancers and agencies", monthlyPrice: "INR 1499", credits: 10, amount: 1499,
    features: [{ text: "10 client tracking slots" }, { text: "Polite reminders every 2 days" }, { text: "Priority workflow support" }, { text: "Immediate dashboard updates" }],
    button: { text: "Buy 10 Credit(s) - INR 1499" } },
];

export default function BillingClient() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [successCredits, setSuccessCredits] = useState<number | null>(null);

  const particles = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ id: i, x: (i % 4) * 22 - 33, y: Math.floor(i / 4) * 22 - 33 })),
    []
  );

  async function buyCredits(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) { setError("Invalid plan selected."); return; }

    setMessage(""); setError("");
    setLoadingPlanId(planId);

    try {
      const user = auth.currentUser;
      if (!user) { setError("Please log in to continue."); setLoadingPlanId(null); return; }

      const idToken = await user.getIdToken();

      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded || !window.Razorpay) {
        setError("Payment gateway failed to load."); setLoadingPlanId(null); return;
      }

      // Create order via our Next.js route (replaces Supabase Edge Function)
      const res = await fetch("/api/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ amount: plan.amount, credits: plan.credits }),
      });

      if (!res.ok) {
        const bodyText = await res.text();
        setError(`Failed to initialize payment. ${bodyText || ""}`.trim());
        setLoadingPlanId(null); return;
      }

      const order = await res.json();

      const razorpay = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: "INR",
        name: "FreelancerOS",
        description: `${plan.credits} Credits`,
        order_id: order.order_id,
        handler: async (response) => {
          const verifyPayload = { ...response, user_id: user.uid, credits: plan.credits };

          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify(verifyPayload),
          });

          if (!verifyRes.ok) {
            let errMsg = "Payment received but verification failed.";
            try { const body = await verifyRes.json(); if (body?.error) errMsg = body.error; } catch {}
            setError(errMsg); setLoadingPlanId(null); return;
          }

          setSuccessCredits(plan.credits);
          setLoadingPlanId(null);
          router.refresh();
          window.setTimeout(() => setSuccessCredits(null), 3200);
        },
        modal: { ondismiss: () => { setMessage("Payment window closed."); setLoadingPlanId(null); } },
      });

      razorpay.open();
    } catch (e) {
      setError(`Something went wrong. ${e instanceof Error ? e.message : "Please try again."}`);
      setLoadingPlanId(null);
    }
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.14),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.12),transparent_40%)]" />
      <motion.button onClick={() => router.push("/dashboard")} className="fixed left-4 top-4 z-20 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20 transition" whileHover={{ y: -1, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        {"<- Back to dashboard"}
      </motion.button>

      <div className="relative h-full flex items-center justify-center px-4 pb-4">
        <Pricing2 heading="Buy Credits" description="Choose a plan and top up your freelancer account instantly."
          plans={plans} onPlanSelect={buyCredits} loadingPlanId={loadingPlanId}
          disabled={loadingPlanId !== null} statusMessage={message} errorMessage={error} />
      </div>

      <AnimatePresence>
        {successCredits !== null && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.6, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 180, damping: 14 }}
              className="relative mx-4 w-full max-w-md rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-500/15 to-black p-8 text-center shadow-[0_0_60px_rgba(16,185,129,0.35)]">
              {particles.map((p) => (
                <motion.div key={p.id} className="absolute h-2 w-2 rounded-full bg-emerald-300"
                  initial={{ opacity: 0, x: 0, y: 0 }} animate={{ opacity: [0, 1, 0], x: p.x, y: p.y }}
                  transition={{ duration: 1.6, delay: 0.1 + p.id * 0.03, repeat: 1 }}
                  style={{ left: "50%", top: "48%" }} />
              ))}
              <motion.div animate={{ rotate: [0, -10, 10, -6, 0], scale: [1, 1.08, 1] }} transition={{ duration: 1.2, repeat: 1 }}
                className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-black shadow-[0_0_35px_rgba(16,185,129,0.55)]">
                <Bitcoin className="h-10 w-10" />
              </motion.div>
              <motion.h3 className="text-2xl font-semibold text-white" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                Payment Successful
              </motion.h3>
              <motion.p className="mt-2 text-emerald-200" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                You just bought {successCredits} {successCredits === 1 ? "credit" : "credits"}.
              </motion.p>
              <motion.div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                <CheckCircle2 className="h-4 w-4" />
                Credits are now active in your account
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
