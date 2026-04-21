"use client";

import { GlowCard } from "@/components/ui/spotlight-card";

import { useCallback, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";
import { overdueDays } from "@/lib/overdue";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Download, Mail, MessageCircle, Trash2 } from "lucide-react";

type Client = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  work: string;
  amount: number;
  currency: string;
  due_date: string;
  created_at: string;
  paid: boolean;
  paused: boolean;
  notes?: string;
  reminder_stage: string;
  paid_at?: string;
};

type EmailLog = {
  id: string;
  tone: string;
  sent_at: string;
  attempt_number: number;
};

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ref = doc(db, "clients", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      setClient(null);
      setLoading(false);
      return;
    }
    const data = { id: snap.id, ...snap.data() } as Client;
    setClient(data);
    setNotes(data.notes ?? "");

    const logsSnap = await getDocs(
      query(collection(db, "email_logs"), where("client_id", "==", id), orderBy("sent_at", "desc"))
    );
    setLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as EmailLog)));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      load();
    });
    return () => unsub();
  }, [router, load]);

  const saveNotes = async () => {
    if (!client) return;
    setSavingNotes(true);
    await updateDoc(doc(db, "clients", client.id), {
      notes,
      updated_at: new Date().toISOString(),
    });
    setSavingNotes(false);
  };

  const markPaid = async () => {
    if (!client) return;
    setAction("paid");
    const paidAt = new Date().toISOString();
    await updateDoc(doc(db, "clients", client.id), {
      paid: true,
      status: "paid",
      paid_at: paidAt,
      updated_at: paidAt,
    });
    setClient({ ...client, paid: true, paid_at: paidAt });
    setAction(null);
  };

  const deleteClient = async () => {
    if (!client) return;
    setAction("delete");
    await deleteDoc(doc(db, "clients", client.id));
    router.push("/clients");
  };

  const openPreview = async () => {
    setSendError(null);
    const res = await fetch("/api/reminders/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: id, preview: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSendError(data.error || "Preview failed");
      return;
    }
    setPreview({ subject: data.subject, body: data.body });
  };

  const sendReminder = async (force: boolean) => {
    setSendError(null);
    setAction("send");
    const res = await fetch("/api/reminders/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: id, force }),
    });
    const data = await res.json();
    setAction(null);
    if (!res.ok) {
      setSendError(data.error || "Send failed");
      return;
    }
    setPreview(null);
    load();
  };

  const whatsapp = async () => {
    setSendError(null);
    setAction("wa");
    const res = await fetch("/api/reminders/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: id }),
    });
    const data = await res.json();
    setAction(null);
    if (!res.ok) {
      setSendError(data.error || "WhatsApp failed");
      return;
    }
    if (data.waLink) window.open(data.waLink, "_blank");
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[40vh] text-gray-400 text-sm">Loading…</div>
      </>
    );
  }

  if (!client) {
    return (
      <>
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-gray-400 mb-4">Client not found.</p>
          <Link href="/clients" className="text-emerald-400 hover:text-emerald-300 text-sm">
            ← Back to clients
          </Link>
        </div>
      </>
    );
  }

  const od = overdueDays(client.due_date, client.paid);

  return (
    <>
      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-lg rounded-2xl border border-gray-700 bg-[#0d1117] p-6 max-h-[85vh] overflow-y-auto"
            >
              <h3 className="text-sm font-semibold text-white mb-1">Email preview</h3>
              <p className="text-xs text-gray-500 mb-3">{preview.subject}</p>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans bg-black/30 rounded-xl p-4 border border-gray-800 mb-4">
                {preview.body}
              </pre>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => sendReminder(true)}
                  disabled={action === "send"}
                  className="flex-1 min-w-[120px] rounded-xl bg-emerald-500 text-black font-semibold py-2.5 text-sm disabled:opacity-50"
                >
                  {action === "send" ? "Sending…" : "Send now"}
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="px-4 rounded-xl bg-white/10 text-gray-300 py-2.5 text-sm"
                >
                  Cancel
                </button>
              </div>
              {sendError && <p className="text-xs text-red-400 mt-2">{sendError}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-6 pb-12 relative z-10">
        <div className="flex flex-wrap items-center gap-4 mb-2">
          <button
            type="button"
            onClick={() => router.push("/clients")}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Clients
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light text-white mb-1">{client.client_name}</h1>
            <p className="text-gray-400 text-sm">{client.client_email}</p>
            {client.client_phone && <p className="text-gray-500 text-xs mt-1">{client.client_phone}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  client.paid
                    ? "bg-emerald-500/15 text-emerald-400"
                    : client.paused
                      ? "bg-gray-500/15 text-gray-400"
                      : "bg-yellow-500/15 text-yellow-400"
                }`}
              >
                {client.paid ? "Paid" : client.paused ? "Paused" : "Pending"}
              </span>
              {od !== null && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/25">
                  Overdue {od} days
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/clients/${client.id}/invoice`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm text-gray-200"
            >
              <Download className="w-4 h-4" />
              PDF
            </a>
            {!client.paid && (
              <>
                <button
                  type="button"
                  onClick={openPreview}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30"
                >
                  <Mail className="w-4 h-4" />
                  Reminder
                </button>
                <button
                  type="button"
                  onClick={whatsapp}
                  disabled={action === "wa"}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/15 text-green-400 text-sm hover:bg-green-500/25 disabled:opacity-50"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </>
            )}
          </div>
        </div>

        {sendError && !preview && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{sendError}</div>
        )}

        <GlowCard customSize>
          <h2 className="text-sm font-semibold text-white mb-4">Invoice</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Work</p>
              <p className="text-gray-200">{client.work}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Amount</p>
              <p className="text-amber-400 font-bold text-lg">{formatMoney(Number(client.amount), client.currency)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Due</p>
              <p className="text-gray-300">{fmt(client.due_date)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Added</p>
              <p className="text-gray-300">{fmt(client.created_at)}</p>
            </div>
            {client.paid_at && (
              <div>
                <p className="text-gray-500 text-xs mb-1">Paid on</p>
                <p className="text-emerald-400">{fmt(client.paid_at)}</p>
              </div>
            )}
          </div>
          {!client.paid && (
            <button
              type="button"
              onClick={markPaid}
              disabled={action === "paid"}
              className="mt-6 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-sm disabled:opacity-50"
            >
              {action === "paid" ? "…" : "Mark as paid"}
            </button>
          )}
        </GlowCard>

        <GlowCard customSize>
          <h2 className="text-sm font-semibold text-white mb-2">Notes</h2>
          <p className="text-xs text-gray-500 mb-3">Private — only you see this.</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full bg-black/30 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50"
            placeholder="e.g. Prefers WhatsApp, invoice sent via…"
          />
          <button
            type="button"
            onClick={saveNotes}
            disabled={savingNotes}
            className="mt-3 px-4 py-2 rounded-lg bg-white/10 text-sm text-gray-200 hover:bg-white/15 disabled:opacity-50"
          >
            {savingNotes ? "Saving…" : "Save notes"}
          </button>
        </GlowCard>

        <GlowCard customSize>
          <h2 className="text-sm font-semibold text-white mb-4">Reminder history</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500">No emails sent yet.</p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex justify-between gap-4 text-sm border-b border-gray-800/50 pb-3 last:border-0"
                >
                  <div>
                    <span className="text-gray-300 capitalize">{log.tone}</span>
                    <span className="text-gray-600 text-xs ml-2">#{log.attempt_number}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{fmt(log.sent_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </GlowCard>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={deleteClient}
            disabled={action === "delete"}
            className="inline-flex items-center gap-2 text-red-400/90 hover:text-red-300 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete client
          </button>
        </div>
      </div>
    </>
  );
}
