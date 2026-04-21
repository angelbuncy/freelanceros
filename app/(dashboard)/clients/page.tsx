"use client";

import { GlowCard } from "@/components/ui/spotlight-card";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Trash2, Download } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { overdueDays } from "@/lib/overdue";
import { useDashboardSearch } from "@/components/providers/app-providers";
import { downloadCsv } from "@/lib/export-csv";

type Client = {
  id: string;
  client_name: string;
  client_email: string;
  work: string;
  amount: number;
  currency: string;
  due_date: string;
  created_at: string;
  paid: boolean;
  paused: boolean;
  reminder_stage: string;
};

const PAGE_SIZE = 20;

export default function ClientsPage() {
  const router = useRouter();
  const { headerSearch } = useDashboardSearch();
  const [uid, setUid] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testimonialFor, setTestimonialFor] = useState<string | null>(null);
  const [testimonialLoading, setTestimonialLoading] = useState(false);

  const loadData = useCallback(async (userId: string, cursor?: QueryDocumentSnapshot<DocumentData>) => {
    const base = collection(db, "clients");
    const ordered = orderBy("created_at", "desc");
    const scoped = where("user_id", "==", userId);
    const q = cursor
      ? query(base, scoped, ordered, startAfter(cursor), limit(PAGE_SIZE + 1))
      : query(base, scoped, ordered, limit(PAGE_SIZE + 1));
    const snap = await getDocs(q);
    const docs = snap.docs;
    const more = docs.length > PAGE_SIZE;
    const pageDocs = more ? docs.slice(0, PAGE_SIZE) : docs;
    const mapped = pageDocs.map((d) => ({ id: d.id, ...d.data() } as Client));
    if (cursor) {
      setClients((prev) => [...prev, ...mapped]);
    } else {
      setClients(mapped);
    }
    setLastDoc(pageDocs.length ? pageDocs[pageDocs.length - 1] : null);
    setHasMore(more);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/auth"); return; }
      setUid(user.uid);
      setLoading(true);
      loadData(user.uid);
    });
    return () => unsub();
  }, [router, loadData]);

  const markPaid = async (id: string) => {
    setActionId(id);
    const paidAt = new Date().toISOString();
    await updateDoc(doc(db, "clients", id), {
      paid: true, status: "paid", paid_at: paidAt, updated_at: paidAt,
    });
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, paid: true, paid_at: paidAt } : c)));
    setActionId(null);
    setTestimonialFor(id);
  };

  const sendTestimonial = async () => {
    if (!testimonialFor) return;
    setTestimonialLoading(true);
    try {
      const res = await fetch(`/api/clients/${testimonialFor}/testimonial`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Could not send email");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    }
    setTestimonialLoading(false);
    setTestimonialFor(null);
  };

  const loadMore = () => {
    if (!uid || !lastDoc || !hasMore || loadingMore) return;
    setLoadingMore(true);
    loadData(uid, lastDoc);
  };

  const filtered = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.client_name.toLowerCase().includes(q) ||
        c.client_email.toLowerCase().includes(q) ||
        c.work.toLowerCase().includes(q)
    );
  }, [clients, headerSearch]);

  const exportCsv = () => {
    downloadCsv(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Work", "Amount", "Currency", "Due date", "Paid", "Created"],
      clients.map((c) => [
        c.client_name, c.client_email, c.work, c.amount, c.currency,
        c.due_date, c.paid ? "yes" : "no", c.created_at,
      ])
    );
  };

  const togglePause = async (id: string, current: boolean) => {
    setActionId(id);
    await updateDoc(doc(db, "clients", id), { paused: !current, updated_at: new Date().toISOString() });
    setClients((prev) => prev.map((c) => c.id === id ? { ...c, paused: !current } : c));
    setActionId(null);
  };

  const deleteClient = async (id: string) => {
    setActionId(id);
    await deleteDoc(doc(db, "clients", id));
    setClients((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirm(null);
    setActionId(null);
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  // Modal base classes that work in both modes
  const modalCard = "w-full max-w-sm rounded-2xl border bg-white dark:bg-[#0d1117] p-6 shadow-xl";

  return (
    <>

      {/* ── Testimonial modal ── */}
      <AnimatePresence>
        {testimonialFor && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`${modalCard} border-emerald-500/30 max-w-md`}
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                Send a thank-you &amp; review request?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                We can email your client a short thank-you note and ask for a review (uses your Resend settings).
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTestimonialFor(null)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={sendTestimonial}
                  disabled={testimonialLoading}
                  className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-60"
                >
                  {testimonialLoading ? "Sending…" : "Send email"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Delete confirm modal ── */}
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className={`${modalCard} border-red-500/30 mx-4`}
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Remove client?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                This will permanently delete the client and all their email logs.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteClient(deleteConfirm)}
                  disabled={actionId === deleteConfirm}
                  className="flex-1 rounded-xl bg-red-500/90 py-2.5 text-sm text-white hover:bg-red-500 transition disabled:opacity-60"
                >
                  {actionId === deleteConfirm ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6 pb-12 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-light text-slate-900 dark:text-white mb-1">Clients</h1>
            <p className="text-gray-500 text-sm">Everyone you&apos;ve done work for — and are owed by.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={clients.length === 0}
              className="px-4 py-2.5 bg-black/8 dark:bg-white/10 text-slate-700 dark:text-gray-200 font-medium rounded-lg hover:bg-black/15 dark:hover:bg-white/15 transition-colors flex items-center gap-2 text-sm disabled:opacity-40 border border-gray-300 dark:border-transparent"
            >
              Export CSV
            </button>
            <button
              onClick={() => router.push("/clients/new")}
              className="px-5 py-2.5 bg-emerald-500 text-slate-950 font-semibold rounded-lg hover:bg-emerald-400 transition-colors flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Client
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-50 dark:bg-red-400/10 p-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <GlowCard customSize>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800/60">
                  <th className="pb-3 pr-4 font-semibold">#</th>
                  <th className="pb-3 pr-4 font-semibold">Client</th>
                  <th className="pb-3 pr-4 font-semibold">Work</th>
                  <th className="pb-3 pr-4 font-semibold text-right">Invoice</th>
                  <th className="pb-3 pr-4 font-semibold">Due Date</th>
                  <th className="pb-3 pr-4 font-semibold">Added</th>
                  <th className="pb-3 pr-4 font-semibold text-center">Status</th>
                  <th className="pb-3 pr-4 font-semibold text-center">Stage</th>
                  <th className="pb-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="py-3">
                    <div className="h-7 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
                  </td></tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="py-10 text-center">
                    <p className="text-gray-500">{clients.length === 0 ? "No clients yet." : "No matches for your search."}</p>
                    {clients.length === 0 && (
                      <button onClick={() => router.push("/clients/new")} className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline transition-colors">
                        + Add your first client
                      </button>
                    )}
                  </td></tr>
                )}
                {filtered.map((c, i) => {
                  const od = overdueDays(c.due_date, c.paid);
                  return (
                    <tr key={c.id} className={`hover:bg-black/2 dark:hover:bg-white/5 transition-colors ${c.paid ? "opacity-50" : ""}`}>
                      <td className="py-3 pr-4 text-gray-400">{i + 1}</td>
                      <td className="py-3 pr-4">
                        <Link href={`/clients/${c.id}`} className="block group">
                          <div className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{c.client_name}</div>
                          <div className="text-gray-500 mt-0.5">{c.client_email}</div>
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 max-w-[120px] truncate">{c.work}</td>
                      <td className="py-3 pr-4 text-right font-bold text-amber-600 dark:text-amber-400">
                        {formatMoney(Number(c.amount), c.currency)}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {fmt(c.due_date)}
                        {od !== null && (
                          <span className="block text-[10px] text-red-500 mt-0.5">Overdue {od}d</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-400">{fmt(c.created_at)}</td>
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
                      <td className="py-3 pr-4 text-center text-gray-500 capitalize">
                        {c.paid ? "—" : c.reminder_stage}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <a
                            href={`/api/clients/${c.id}/invoice`}
                            className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-gray-500 dark:text-gray-400"
                            title="Download PDF"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={11} />
                          </a>
                          {!c.paid && (
                            <>
                              <button
                                onClick={() => markPaid(c.id)}
                                disabled={actionId === c.id}
                                className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 text-gray-600 dark:text-gray-300 text-[11px]"
                              >
                                {actionId === c.id ? "..." : "Paid ✓"}
                              </button>
                              <button
                                onClick={() => togglePause(c.id, c.paused)}
                                disabled={actionId === c.id}
                                className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition disabled:opacity-50 text-gray-500 dark:text-gray-400"
                              >
                                {c.paused ? <Play size={11} /> : <Pause size={11} />}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(c.id)}
                            disabled={actionId === c.id}
                            className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition disabled:opacity-50 text-gray-500 dark:text-gray-400"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasMore && !headerSearch.trim() && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="px-5 py-2 rounded-xl bg-black/5 dark:bg-white/10 border border-gray-200 dark:border-transparent text-sm text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/15 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </GlowCard>
      </div>
    </>
  );
}
