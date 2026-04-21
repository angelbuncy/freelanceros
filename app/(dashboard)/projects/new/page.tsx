"use client";

import { GlowCard } from "@/components/ui/spotlight-card";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      setUid(user.uid);
      const snap = await getDocs(query(collection(db, "clients"), where("user_id", "==", user.uid)));
      setClients(snap.docs.map((d) => ({ id: d.id, name: d.data().client_name || "Client" })));
    });
    return () => unsub();
  }, [router]);

  const submit = async () => {
    if (!uid || !title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setLoading(true);
    const now = new Date().toISOString();
    try {
      await addDoc(collection(db, "projects"), {
        user_id: uid,
        title: title.trim(),
        description: description.trim(),
        client_id: clientId || "",
        status: "not_started",
        created_at: now,
        updated_at: now,
      });
      router.push("/projects");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="max-w-xl mx-auto pb-12 relative z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white text-sm"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-light text-white mb-6">New project</h1>
        {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</div>}
        <GlowCard customSize>
          <div className="space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project title"
              className="w-full bg-black/40 border border-gray-800/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full bg-black/40 border border-gray-800/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Link client (optional)</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-black/40 border border-gray-800/60 rounded-xl px-3 py-3 text-sm text-white"
              >
                <option value="">None</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 text-black font-semibold py-3 text-sm disabled:opacity-60"
            >
              {loading ? "Saving…" : "Create project"}
            </button>
          </div>
        </GlowCard>
      </div>
    </>
  );
}
