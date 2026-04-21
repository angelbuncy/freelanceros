"use client";

import { useCallback, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Bell } from "lucide-react";
import { formatNotification } from "./formatNotification";
import { AnimatePresence, motion } from "framer-motion";

type EmailNotificationRow = {
  id: string;
  client_id: string;
  tone: "polite" | "firm" | "final";
  sent_at: string;
  attempt_number: number;
};

type ClientMeta = {
  id: string;
  client_name: string;
  work: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<EmailNotificationRow[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, ClientMeta>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async (uid: string) => {
    const logsSnap = await getDocs(
      query(collection(db, "email_logs"), where("user_id", "==", uid), orderBy("sent_at", "desc"), limit(10))
    );
    const data = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as EmailNotificationRow));
    setNotifications(data);

    const uniqueClientIds = Array.from(new Set(data.map((n) => n.client_id)));
    if (uniqueClientIds.length === 0) { setClientMap({}); setLoading(false); return; }

    const clientsSnap = await getDocs(
      query(collection(db, "clients"), where("user_id", "==", uid))
    );
    const nextMap: Record<string, ClientMeta> = {};
    for (const d of clientsSnap.docs) {
      if (uniqueClientIds.includes(d.id)) {
        nextMap[d.id] = { id: d.id, client_name: d.data().client_name, work: d.data().work };
      }
    }
    setClientMap(nextMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      loadNotifications(user.uid);
      const t = setInterval(() => loadNotifications(user.uid), 30000);
      return () => clearInterval(t);
    });
    return () => unsub();
  }, [loadNotifications]);

  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
        title="Notifications"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell size={18} />
        {notifications.length > 0 && (
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute -right-1 -top-1 min-w-5 h-5 rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-black flex items-center justify-center"
          >
            {notifications.length > 99 ? "99+" : notifications.length}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-96 bg-black/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl z-50"
          >
            <div className="p-3 border-b border-white/10 text-sm font-medium">Notifications</div>
            <div className="max-h-80 overflow-y-auto">
              {loading && <p className="p-4 text-sm text-slate-400">Loading notifications...</p>}
              {!loading && notifications.length === 0 && <p className="p-4 text-sm text-slate-400">No notifications yet.</p>}
              {notifications.map((n) => {
                const client = clientMap[n.client_id];
                if (!client) return null;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 text-sm border-b border-white/5 hover:bg-white/5"
                  >
                    {formatNotification(n.tone, client.client_name, client.work)}
                    <div className="text-xs text-slate-500 mt-1">{new Date(n.sent_at).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Attempt #{n.attempt_number}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
