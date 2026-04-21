"use client";

import { GlowCard } from "@/components/ui/spotlight-card";

import { EarningsChart } from "@/components/dashboard/EarningsChart";

import { useEffect, useState, useCallback, useMemo } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

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
  reminder_stage: string;
  created_at: string;
  paid_at?: string;
  updated_at?: string;
};

type EmailLog = {
  id: string;
  client_id: string;
  tone: string;
  sent_at: string;
  attempt_number: number;
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("there");
  const [stats, setStats] = useState({ pendingCount: 0, receivedCount: 0, pendingAmount: 0, activeClients: 0 });
  const [recentActivity, setRecentActivity] = useState<(EmailLog & { client_name?: string; amount?: number; currency?: string })[]>([]);
  const [topClients, setTopClients] = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingVisible, setOnboardingVisible] = useState(false);

  const loadDashboard = useCallback(async (uid: string, displayName: string | null, email: string | null) => {
    if (displayName) setUserName(displayName.split(" ")[0]);
    else if (email) setUserName(email.split("@")[0]);

    const clientsSnap = await getDocs(
      query(collection(db, "clients"), where("user_id", "==", uid), orderBy("created_at", "desc"))
    );
    const allClients = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
    setAllClients(allClients);
    const pending = allClients.filter((c) => !c.paid);
    const paid = allClients.filter((c) => c.paid);
    const pendingAmount = pending.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    setStats({ pendingCount: pending.length, receivedCount: paid.length, pendingAmount, activeClients: allClients.length });
    setTopClients(allClients.slice(0, 4));

    const logsSnap = await getDocs(
      query(collection(db, "email_logs"), where("user_id", "==", uid), orderBy("sent_at", "desc"), limit(4))
    );
    const logs = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as EmailLog));
    const enriched = logs.map((log) => {
      const client = allClients.find((c) => c.id === log.client_id);
      return {
        ...log,
        client_name: client?.client_name ?? "Unknown Client",
        amount: client?.amount ?? 0,
        currency: client?.currency ?? "INR",
      };
    });
    setRecentActivity(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("freelanceros_onboarding_dismissed")) {
      setOnboardingVisible(true);
    }
  }, []);

  const chartData = useMemo(() => {
    const paid = allClients.filter((c) => c.paid);
    const sums = new Map<string, number>();
    for (const c of paid) {
      const raw = c.paid_at || c.updated_at || c.created_at;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const k = monthKey(d);
      sums.set(k, (sums.get(k) ?? 0) + Number(c.amount || 0));
    }
    const keys = Array.from(sums.keys()).sort();
    const last = keys.slice(-12);
    return last.map((k) => ({ month: labelMonth(k), total: sums.get(k) ?? 0, key: k }));
  }, [allClients]);

  const mixedCurrency = useMemo(() => {
    const paid = allClients.filter((c) => c.paid);
    const cur = new Set(paid.map((c) => (c.currency || "INR").toUpperCase()));
    return cur.size > 1;
  }, [allClients]);

  const pendingAmountDisplay = useMemo(() => {
    const pendingList = allClients.filter((c) => !c.paid);
    const cur = new Set(pendingList.map((c) => (c.currency || "INR").toUpperCase()));
    if (cur.size > 1) {
      return `${stats.pendingAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} (mixed)`;
    }
    return formatMoney(stats.pendingAmount, [...cur][0] || "INR");
  }, [allClients, stats.pendingAmount]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/auth"); return; }
      loadDashboard(user.uid, user.displayName, user.email);
    });
    return () => unsub();
  }, [router, loadDashboard]);

  const toneColor = (t: string) => t === "polite" ? "text-emerald-400" : t === "firm" ? "text-yellow-400" : "text-red-400";
  const toneLabel = (t: string, n: number) => ({ polite: "Polite reminder", firm: "Firm follow-up", final: "Final notice" }[t] ?? t) + ` #${n}`;

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 animate-pulse text-sm">Loading your dashboard...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 pb-12 relative z-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-light text-slate-900 dark:text-white mb-3 tracking-tight">Hey {userName},</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[15px] max-w-2xl leading-relaxed">
              These are the people who owe you for your work. You showed up.{" "}
              <br className="hidden sm:block" />
              FreelancerOS has your back now.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={() => router.push("/clients/new")} className="px-5 py-2.5 bg-emerald-400 text-slate-950 font-semibold rounded-lg hover:bg-emerald-300 transition-colors flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Add Client
            </button>
            <button onClick={() => router.push("/reminders")} className="px-5 py-2.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white font-medium rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              Reminders
            </button>
          </div>
        </div>

        {onboardingVisible && stats.activeClients === 0 && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Welcome to FreelancerOS</p>
              <p className="text-xs text-gray-400 mt-1">Add your first client to track invoices and automatic reminders.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => router.push("/clients/new")}
                className="px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 text-sm font-semibold"
              >
                Add client
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("freelanceros_onboarding_dismissed", "1");
                  setOnboardingVisible(false);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "PAYMENTS PENDING", value: stats.pendingCount, sub: stats.pendingCount === 0 ? "All caught up!" : "Awaiting payment", color: "text-yellow-500" },
            { label: "PAYMENTS RECEIVED", value: stats.receivedCount, sub: "Successfully collected", color: "text-emerald-400" },
            {
              label: "PENDING AMOUNT",
              value: pendingAmountDisplay,
              sub: "Total outstanding",
              color: "text-slate-900 dark:text-white",
            },
            { label: "ACTIVE CLIENTS", value: stats.activeClients, sub: "In your tracker", color: "text-slate-900 dark:text-white" },
          ].map((stat) => (
            <GlowCard key={stat.label} customSize className="h-36 flex flex-col justify-start gap-0">
              <h3 className="text-[11px] font-bold text-gray-500 tracking-wider mb-3">{stat.label}</h3>
              <div className={`text-3xl font-bold mb-1.5 ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{stat.sub}</div>
            </GlowCard>
          ))}
        </div>

        <GlowCard customSize>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Earnings (paid invoices)</h3>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">By month</span>
          </div>
          <EarningsChart data={chartData.map(({ month, total }) => ({ month, total }))} mixedCurrency={mixedCurrency} />
        </GlowCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlowCard customSize className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
              <Link href="/reminders" className="text-xs text-emerald-400 hover:text-emerald-300">View all →</Link>
            </div>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No reminders sent yet.</p>
                  <p className="text-xs text-gray-600 mt-1">Add a client with a past due date to start sending reminders automatically.</p>
                </div>
              ) : recentActivity.map((a) => (
                <div key={a.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.client_name}</p>
                    <p className={`text-xs ${toneColor(a.tone)}`}>{toneLabel(a.tone, a.attempt_number)}</p>
                    <p className="text-xs text-gray-600">{new Date(a.sent_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 shrink-0">
                    {formatMoney(Number(a.amount || 0), a.currency || "INR")}
                  </span>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard customSize>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Your Clients</h3>
              <Link href="/clients" className="text-xs text-emerald-400 hover:text-emerald-300">View all →</Link>
            </div>
            <div className="space-y-4">
              {topClients.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No clients yet.</p>
                  <button onClick={() => router.push("/clients/new")} className="mt-2 text-xs text-emerald-400">+ Add your first client</button>
                </div>
              ) : topClients.map((c, i) => (
                <div key={c.id}>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                      <Link href={`/clients/${c.id}`} className="font-medium text-slate-900 dark:text-white truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                        {c.client_name}
                      </Link>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ml-2 ${c.paid ? "text-emerald-400" : c.paused ? "text-gray-400" : "text-yellow-400"}`}>
                      {c.paid ? "Paid" : c.paused ? "Paused" : "Pending"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1.5 pl-7">
                    {formatMoney(Number(c.amount), c.currency)} · {c.work}
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c.paid ? "bg-emerald-400" : "bg-yellow-500/60"}`} style={{ width: c.paid ? "100%" : "40%" }} />
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlowCard customSize className="cursor-pointer hover:border-emerald-500/30 transition-colors">
            <Link href="/clients/new" className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl"><svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg></div>
              <div><p className="text-sm font-semibold text-slate-900 dark:text-white">Add Client</p><p className="text-xs text-gray-500">Track a new invoice</p></div>
            </Link>
          </GlowCard>
          <GlowCard customSize className="cursor-pointer hover:border-emerald-500/30 transition-colors">
            <Link href="/reminders" className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl"><svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
              <div><p className="text-sm font-semibold text-slate-900 dark:text-white">Reminders</p><p className="text-xs text-gray-500">View sent follow-ups</p></div>
            </Link>
          </GlowCard>
          <GlowCard customSize className="cursor-pointer hover:border-emerald-500/30 transition-colors">
            <Link href="/billing" className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl"><svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
              <div><p className="text-sm font-semibold text-slate-900 dark:text-white">Buy Credits</p><p className="text-xs text-gray-500">Top up your balance</p></div>
            </Link>
          </GlowCard>
        </div>
      </div>
    </>
  );
}
