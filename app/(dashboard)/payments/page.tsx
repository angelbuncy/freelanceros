"use client";

import { GlowCard } from "@/components/ui/spotlight-card";
import { useEffect, useState, useCallback } from "react";

import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/currency";
import { overdueDays } from "@/lib/overdue";
import { downloadCsv } from "@/lib/export-csv";

type Client = {
  id: string;
  client_name: string;
  client_email: string;
  work: string;
  amount: number;
  currency: string;
  due_date: string;
  paid: boolean;
  paused: boolean;
  status: string;
  created_at: string;
  paid_at?: string;
};

export default function PaymentsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (uid: string) => {
    const snap = await getDocs(
      query(collection(db, "clients"), where("user_id", "==", uid), orderBy("due_date", "asc"))
    );
    setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client)));
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/auth"); return; }
      loadData(user.uid);
    });
    return () => unsub();
  }, [router, loadData]);

  const markPaid = async (id: string) => {
    setActionId(id);
    try {
      const paidAt = new Date().toISOString();
      await updateDoc(doc(db, "clients", id), {
        paid: true,
        status: "paid",
        paid_at: paidAt,
        updated_at: paidAt,
      });
      setClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, paid: true, status: "paid", paid_at: paidAt } : c))
      );
    } catch (e: any) {
      setError(e.message);
    }
    setActionId(null);
  };

  const filtered = clients.filter((c) => filter === "all" ? true : filter === "paid" ? c.paid : !c.paid);
  const pendingList = clients.filter((c) => !c.paid);
  const paidList = clients.filter((c) => c.paid);
  const totalPending = pendingList.reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid = paidList.reduce((s, c) => s + Number(c.amount), 0);
  const pendingCur = new Set(pendingList.map((c) => (c.currency || "INR").toUpperCase()));
  const paidCur = new Set(paidList.map((c) => (c.currency || "INR").toUpperCase()));
  const fmtPending =
    pendingCur.size > 1
      ? `${totalPending.toLocaleString()} (mixed)`
      : formatMoney(totalPending, [...pendingCur][0] || "INR");
  const fmtPaid =
    paidCur.size > 1 ? `${totalPaid.toLocaleString()} (mixed)` : formatMoney(totalPaid, [...paidCur][0] || "INR");
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const exportPaymentsCsv = () => {
    downloadCsv(
      `payments-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Client", "Email", "Work", "Amount", "Currency", "Due", "Status"],
      clients.map((c) => [
        c.client_name,
        c.client_email,
        c.work,
        c.amount,
        c.currency,
        c.due_date,
        c.paid ? "paid" : c.paused ? "paused" : "pending",
      ])
    );
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 pb-12 relative z-10">
        <div className="flex flex-wrap justify-between gap-4 items-end mb-6">
          <div>
            <h1 className="text-3xl font-light text-slate-900 dark:text-white mb-1">Payments</h1>
            <p className="text-gray-500 text-sm">All your invoices — pending and received.</p>
          </div>
          <button
            type="button"
            onClick={exportPaymentsCsv}
            disabled={clients.length === 0}
            className="px-4 py-2 rounded-xl bg-black/8 dark:bg-white/10 border border-gray-300 dark:border-transparent text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-black/15 dark:hover:bg-white/15 disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlowCard customSize className="flex flex-col justify-start gap-0">
            <p className="text-[11px] font-bold text-gray-500 tracking-wider mb-2">TOTAL PENDING</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{fmtPending}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{clients.filter((c) => !c.paid).length} invoices</p>
          </GlowCard>
          <GlowCard customSize className="flex flex-col justify-start gap-0">
            <p className="text-[11px] font-bold text-gray-500 tracking-wider mb-2">TOTAL COLLECTED</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmtPaid}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{clients.filter((c) => c.paid).length} invoices</p>
          </GlowCard>
          <GlowCard customSize className="flex flex-col justify-start gap-0">
            <p className="text-[11px] font-bold text-gray-500 tracking-wider mb-2">COLLECTION RATE</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {clients.length === 0 ? "—" : `${Math.round((clients.filter((c) => c.paid).length / clients.length) * 100)}%`}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">of all invoices</p>
          </GlowCard>
        </div>

        <GlowCard customSize>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Invoice Ledger</h2>
            <div className="flex gap-2">
              {(["all", "pending", "paid"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors capitalize ${filter === f ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30" : "bg-black/5 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-transparent hover:bg-black/10 dark:hover:bg-white/10"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="mb-3 rounded-xl border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-300">{error}</p>}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800/60">
                  <th className="pb-3 pr-4 font-semibold">Client</th>
                  <th className="pb-3 pr-4 font-semibold">Work</th>
                  <th className="pb-3 pr-4 font-semibold text-right">Amount</th>
                  <th className="pb-3 pr-4 font-semibold">Due Date</th>
                  <th className="pb-3 pr-4 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-3"><div className="h-7 rounded-lg bg-white/5 animate-pulse" /></td></tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">No {filter === "all" ? "" : filter} payments yet.</td></tr>
                )}
                {filtered.map((c) => {
                  const od = overdueDays(c.due_date, c.paid);
                  return (
                  <tr key={c.id} className={`hover:bg-white/5 transition-colors ${c.paid ? "opacity-60" : ""}`}>
                    <td className="py-3 pr-4"><div className="font-medium text-white">{c.client_name}</div><div className="text-gray-500 mt-0.5">{c.client_email}</div></td>
                    <td className="py-3 pr-4 text-gray-300 max-w-[140px] truncate">{c.work}</td>
                    <td className="py-3 pr-4 text-right font-bold text-amber-400">{formatMoney(Number(c.amount), c.currency)}</td>
                    <td className="py-3 pr-4 text-gray-400">
                      {fmt(c.due_date)}
                      {od !== null && (
                        <span className="block text-[10px] text-red-400 mt-0.5">Overdue {od}d</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        c.paid
                          ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : c.paused
                          ? "bg-gray-100 dark:bg-gray-500/15 text-gray-600 dark:text-gray-400"
                          : "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                      }`}>
                        {c.paid ? "Paid" : c.paused ? "Paused" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3">
                      {!c.paid && (
                        <button onClick={() => markPaid(c.id)} disabled={actionId === c.id}
                          className="px-3 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 text-gray-600 dark:text-gray-300">
                          {actionId === c.id ? "..." : "Mark paid"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </GlowCard>
      </div>
    </>
  );
}
