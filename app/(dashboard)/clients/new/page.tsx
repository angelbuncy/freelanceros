"use client";

import { GlowCard } from "@/components/ui/spotlight-card";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function NewClientPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    work: "",
    amount: "",
    currency: "INR",
    due_date: "",
    notes: "",
    client_phone: "",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/auth"); return; }
      setUserId(user.uid);
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      setCredits(profileSnap.data()?.credits ?? 0);
    });
    return () => unsub();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!userId) { setError("Please log in first."); return; }
    if (!form.client_name || !form.client_email || !form.work || !form.amount || !form.due_date) {
      setError("Please fill all fields."); return;
    }
    if ((credits ?? 0) <= 0) {
      setError("You have no credits. Please buy more from the billing page."); return;
    }
    setError(null); setLoading(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: form.client_name,
          client_email: form.client_email,
          work: form.work,
          amount: Number(form.amount),
          currency: form.currency,
          due_date: form.due_date,
          notes: form.notes,
          client_phone: form.client_phone,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to create client.");
        setLoading(false);
        return;
      }

      router.push("/clients");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      setLoading(false);
    }
  };

  // Shared input style — works in both light and dark
  const fi = "w-full bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800/60 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 transition-all";

  return (
    <>
      <div className="max-w-xl mx-auto pb-12 relative z-10">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-light text-slate-900 dark:text-white">Add Client</h1>
            <p className="text-gray-500 text-sm">1 credit is used when creating a client.</p>
          </div>
        </div>

        {credits !== null && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-500 dark:text-gray-400">
              Available credits: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{credits}</span>
            </span>
            {credits === 0 && (
              <button onClick={() => router.push("/billing")} className="ml-2 text-xs text-emerald-600 dark:text-emerald-400 underline">
                Buy credits
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-50 dark:bg-red-400/10 p-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <GlowCard customSize>
          <div className="space-y-4">
            {[
              { name: "client_name", placeholder: "Client Name", type: "text" },
              { name: "client_email", placeholder: "Client Email", type: "email" },
              { name: "work", placeholder: "Work Done (e.g. Logo design for landing page)", type: "text" },
            ].map((field) => (
              <input key={field.name} name={field.name} type={field.type} placeholder={field.placeholder}
                onChange={handleChange} className={fi} />
            ))}

            <div className="flex gap-3">
              <select name="currency" onChange={handleChange}
                className="bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800/60 rounded-xl px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50">
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </select>
              <input name="amount" type="number" placeholder="Invoice Amount" onChange={handleChange}
                className={`flex-1 ${fi}`} />
            </div>

            <input
              name="client_phone"
              type="tel"
              placeholder="Phone (optional, for WhatsApp reminders — include country code)"
              onChange={handleChange}
              className={fi}
            />
            <textarea
              name="notes"
              placeholder="Private notes (optional)"
              rows={2}
              onChange={handleChange}
              className={`${fi} resize-none`}
            />
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Payment Due Date</label>
              <input name="due_date" type="date" onChange={handleChange}
                className={fi} />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold py-3 text-sm disabled:opacity-60 hover:bg-emerald-400 transition-colors"
            >
              {loading ? "Saving..." : "Save Client"}
            </button>
          </div>
        </GlowCard>
      </div>
    </>
  );
}
