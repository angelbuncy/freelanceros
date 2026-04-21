"use client";

import { useCallback, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

type Payment = {
  id: string;
  amount: number;
  credits: number;
  status: string;
  created_at: string;
};

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);

  const load = useCallback(async (uid: string) => {
    const snap = await getDocs(
      query(collection(db, "processed_payments"), where("user_id", "==", uid), orderBy("created_at", "desc"))
    );
    setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      load(user.uid);
    });
    return () => unsub();
  }, [load]);

  return (
    <div className="mt-10">
      <h2 className="text-lg font-medium mb-4">Payment history</h2>
      {payments.length === 0 && <p className="text-sm text-slate-400">No payments yet.</p>}
      <div className="space-y-3">
        {payments.map((p) => (
          <div key={p.id} className="flex justify-between items-center rounded-xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm">INR {p.amount} - {p.credits} credits</p>
              <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleString()}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full ${p.status === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
              {p.status ?? "completed"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
