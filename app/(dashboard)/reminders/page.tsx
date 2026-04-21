"use client";

import { GlowCard } from "@/components/ui/spotlight-card";
import { useEffect, useState, useCallback } from "react";

import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/currency";
import { AnimatePresence, motion } from "framer-motion";

type EmailLog = {
  id: string;
  client_id: string;
  tone: "polite" | "firm" | "final";
  sent_at: string;
  attempt_number: number;
  client_name?: string;
  client_email?: string;
  amount?: number;
  work?: string;
  currency?: string;
};

const toneConfig = {
  polite: {
    label: "Polite",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/20",
  },
  firm: {
    label: "Firm",
    color: "text-amber-700 dark:text-yellow-400",
    bg: "bg-amber-100 dark:bg-yellow-500/15 border-amber-300 dark:border-yellow-500/20",
  },
  final: {
    label: "Final",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-500/15 border-red-300 dark:border-red-500/20",
  },
};

export default function RemindersPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [unpaidIds, setUnpaidIds] = useState<{ id: string; name: string }[]>([]);
  const [manualClientId, setManualClientId] = useState("");
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "polite" | "firm" | "final">("all");

  const loadData = useCallback(async (uid: string) => {
    const logsSnap = await getDocs(
      query(collection(db, "email_logs"), where("user_id", "==", uid), orderBy("sent_at", "desc"))
    );
    const clientsSnap = await getDocs(
      query(collection(db, "clients"), where("user_id", "==", uid))
    );
    const clientMap = new Map(clientsSnap.docs.map((d) => [d.id, d.data()]));
    const unpaid = clientsSnap.docs
      .filter((d) => !d.data().paid && !d.data().paused)
      .map((d) => ({ id: d.id, name: d.data().client_name || "Client" }));
    setUnpaidIds(unpaid);
    const enriched: EmailLog[] = logsSnap.docs.map((d) => {
      const log = d.data();
      const client = clientMap.get(log.client_id);
      return {
        id: d.id,
        client_id: log.client_id,
        tone: log.tone,
        sent_at: log.sent_at,
        attempt_number: log.attempt_number,
        client_name: client?.client_name ?? "Unknown",
        client_email: client?.client_email ?? "",
        amount: client?.amount ?? 0,
        work: client?.work ?? "",
        currency: client?.currency ?? "INR",
      };
    });
    setLogs(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/auth"); return; }
      setUid(user.uid);
      loadData(user.uid);
    });
    return () => unsub();
  }, [router, loadData]);

  const filtered = logs.filter((l) => filter === "all" || l.tone === filter);
  const counts = {
    polite: logs.filter((l) => l.tone === "polite").length,
    firm: logs.filter((l) => l.tone === "firm").length,
    final: logs.filter((l) => l.tone === "final").length,
  };
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const openManualPreview = async () => {
    if (!manualClientId) return;
    setSendErr(null);
    const res = await fetch("/api/reminders/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: manualClientId, preview: true }),
    });
    const data = await res.json();
    if (!res.ok) { setSendErr(data.error || "Preview failed"); return; }
    setPreview({ subject: data.subject, body: data.body });
  };

  const sendManual = async () => {
    if (!manualClientId) return;
    setSending(true); setSendErr(null);
    const res = await fetch("/api/reminders/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: manualClientId, force: true }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setSendErr(data.error || "Send failed"); return; }
    setPreview(null);
    if (uid) loadData(uid);
  };

  const fi = "w-full bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800/60 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50";

  return (
    <>

      {/* ── Preview modal ── */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d1117] p-6 max-h-[85vh] overflow-y-auto shadow-xl"
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Email preview</h3>
              <p className="text-xs text-gray-500 mb-3">{preview.subject}</p>
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans bg-slate-50 dark:bg-black/30 rounded-xl p-4 border border-gray-200 dark:border-gray-800 mb-4">
                {preview.body}
              </pre>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={sendManual}
                  disabled={sending}
                  className="flex-1 min-w-[120px] rounded-xl bg-emerald-500 text-slate-950 font-semibold py-2.5 text-sm disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send now"}
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition"
                >
                  Cancel
                </button>
              </div>
              {sendErr && <p className="text-xs text-red-500 mt-2">{sendErr}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6 pb-12 relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-light text-slate-900 dark:text-white mb-1">Reminders</h1>
          <p className="text-gray-500 text-sm">All follow-up emails sent automatically on your behalf.</p>
        </div>

        {/* ── Manual send ── */}
        <GlowCard customSize>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Send reminder now</h2>
          <p className="text-xs text-gray-500 mb-4">
            Preview the same email the cron would send, then deliver immediately (bypasses the 2-day spacing).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Client</label>
              <select
                value={manualClientId}
                onChange={(e) => setManualClientId(e.target.value)}
                className={fi}
              >
                <option value="">Select unpaid client…</option>
                {unpaidIds.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!manualClientId}
              onClick={openManualPreview}
              className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-40 border border-emerald-500/30"
            >
              Preview &amp; send
            </button>
          </div>
          {sendErr && !preview && <p className="text-xs text-red-500 mt-3">{sendErr}</p>}
        </GlowCard>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["polite", "firm", "final"] as const).map((tone) => {
            const cfg = toneConfig[tone];
            return (
              <GlowCard key={tone} customSize className="flex flex-col justify-start gap-0">
                <p className="text-[11px] font-bold text-gray-500 tracking-wider mb-2">
                  {cfg.label.toUpperCase()} REMINDERS
                </p>
                <p className={`text-2xl font-bold ${cfg.color}`}>{counts[tone]}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">emails sent</p>
              </GlowCard>
            );
          })}
        </div>

        {/* ── Email log ── */}
        <GlowCard customSize>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Email Log</h2>
            <div className="flex gap-2">
              {(["all", "polite", "firm", "final"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors capitalize ${
                    filter === f
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30"
                      : "bg-black/5 dark:bg-white/5 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10 border border-gray-200 dark:border-transparent"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800/60">
                  <th className="pb-3 pr-4 font-semibold">Client</th>
                  <th className="pb-3 pr-4 font-semibold">Work</th>
                  <th className="pb-3 pr-4 font-semibold text-right">Amount</th>
                  <th className="pb-3 pr-4 font-semibold text-center">Tone</th>
                  <th className="pb-3 pr-4 font-semibold text-center">Attempt</th>
                  <th className="pb-3 font-semibold">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-3">
                    <div className="h-7 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
                  </td></tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center">
                    <p className="text-gray-500 text-sm">No reminders sent yet.</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Reminders are sent automatically once a client's due date passes and you have credits.
                    </p>
                  </td></tr>
                )}
                {filtered.map((log) => {
                  const cfg = toneConfig[log.tone] ?? toneConfig.polite;
                  return (
                    <tr key={log.id} className="hover:bg-black/2 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{log.client_name}</div>
                        <div className="text-gray-500 mt-0.5">{log.client_email}</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 max-w-[120px] truncate">{log.work}</td>
                      <td className="py-3 pr-4 text-right font-bold text-amber-600 dark:text-amber-400">
                        {formatMoney(Number(log.amount ?? 0), log.currency || "INR")}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center text-gray-500">#{log.attempt_number}</td>
                      <td className="py-3 text-gray-500">{fmt(log.sent_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlowCard>

        {/* ── How it works ── */}
        <GlowCard customSize>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">How reminders work</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Once a client's due date passes, FreelancerOS automatically sends a{" "}
                <span className="text-emerald-600 dark:text-emerald-400">polite</span> reminder every 2 days.
                After the 2nd reminder it escalates to{" "}
                <span className="text-amber-600 dark:text-yellow-400">firm</span>, then to a{" "}
                <span className="text-red-600 dark:text-red-400">final</span> notice.
                1 credit is consumed per client when the client is created. Reminders stop automatically when a client is marked as paid.
              </p>
            </div>
          </div>
        </GlowCard>
      </div>
    </>
  );
}
