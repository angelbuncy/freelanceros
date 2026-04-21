"use client";

import { GlowCard } from "@/components/ui/spotlight-card";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type Profile = {
  full_name: string;
  sender_email: string;
  sender_domain: string;
  payment_link: string;
  reminders_enabled: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [form, setForm] = useState<Profile>({
    full_name: "", sender_email: "", sender_domain: "", payment_link: "", reminders_enabled: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/auth"); return; }
      setUid(user.uid);
      setUserEmail(user.email ?? null);
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        setForm({
          full_name: data.full_name ?? "",
          sender_email: data.sender_email ?? "",
          sender_domain: data.sender_domain ?? "",
          payment_link: data.payment_link ?? "",
          reminders_enabled: data.reminders_enabled ?? true,
        });
        setCredits(data.credits ?? 0);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async () => {
    if (!uid) return;
    setSaving(true); setError(null); setSuccess(false);
    try {
      await updateDoc(doc(db, "profiles", uid), {
        full_name: form.full_name,
        sender_email: form.sender_email,
        sender_domain: form.sender_domain,
        payment_link: form.payment_link,
        reminders_enabled: form.reminders_enabled,
        updated_at: new Date().toISOString(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const fi = "w-full bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800/60 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all";

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6 pb-12 relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-light text-slate-900 dark:text-white mb-1">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your profile and notification preferences.</p>
        </div>

        {/* ── Account card ── */}
        <GlowCard customSize>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Logged in as</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{userEmail ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">{credits} Credits</span>
              <button
                onClick={() => router.push("/billing")}
                className="text-xs text-gray-500 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 hover:border-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                Buy more
              </button>
            </div>
          </div>
        </GlowCard>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-50 dark:bg-red-400/10 p-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            ✓ Settings saved successfully
          </div>
        )}

        {/* ── Profile card ── */}
        <GlowCard customSize>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-5">Profile</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { name: "full_name", label: "Your name", placeholder: "Jane Doe" },
                { name: "sender_email", label: "Sender email", placeholder: "jane@yourdomain.com" },
                { name: "sender_domain", label: "Sender domain", placeholder: "yourdomain.com" },
                { name: "payment_link", label: "Payment link", placeholder: "https://razorpay.me/yourhandle" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="text-xs text-gray-500 mb-1.5 block">{field.label}</label>
                  <input
                    name={field.name}
                    value={(form as Record<string, unknown>)[field.name] as string ?? ""}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    className={fi}
                  />
                </div>
              ))}

              {/* Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800/60 bg-slate-50 dark:bg-black/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Automatic reminders</p>
                  <p className="text-xs text-gray-500 mt-0.5">Send follow-up emails every 2 days</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    name="reminders_enabled"
                    checked={form.reminders_enabled}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 peer-checked:bg-emerald-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold py-3 text-sm disabled:opacity-60 hover:bg-emerald-400 transition-colors"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>
            </div>
          )}
        </GlowCard>
      </div>
    </>
  );
}
