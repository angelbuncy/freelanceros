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
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useDashboardSearch } from "@/components/providers/app-providers";

// ── Types ──────────────────────────────────────────────────────────────────────

type ProjectStatus = "not_started" | "in_progress" | "review" | "done";

type Project = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  client_id?: string;
  client_name?: string;
  amount?: number;
  currency?: string;
  status: ProjectStatus;
  due_date?: string;
  updated_at?: string;
  created_at?: string;
};

// ── Column config ──────────────────────────────────────────────────────────────

const COLUMNS: {
  key: ProjectStatus;
  label: string;
  color: string;
  bg: string;
  dot: string;
  border: string;
}[] = [
  { key: "not_started", label: "Not Started",  color: "text-gray-500 dark:text-gray-400",    bg: "bg-gray-100 dark:bg-gray-500/10",    dot: "bg-gray-400",    border: "border-gray-200 dark:border-gray-700/40" },
  { key: "in_progress", label: "In Progress",  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-500/10",     dot: "bg-blue-400",    border: "border-blue-200 dark:border-blue-700/40" },
  { key: "review",      label: "In Review",    color: "text-amber-600 dark:text-yellow-400", bg: "bg-amber-50 dark:bg-yellow-500/10",  dot: "bg-yellow-400",  border: "border-amber-200 dark:border-yellow-700/40" },
  { key: "done",        label: "Done",          color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", dot: "bg-emerald-400", border: "border-emerald-200 dark:border-emerald-700/40" },
];

function StatusBadge({ status }: { status: ProjectStatus }) {
  const col = COLUMNS.find((c) => c.key === status)!;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${col.bg} ${col.color} border ${col.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
      {col.label}
    </span>
  );
}

// ── New Project Modal ─────────────────────────────────────────────────────────

function NewProjectModal({
  uid,
  clients,
  onClose,
  onCreated,
}: {
  uid: string;
  clients: { id: string; name: string }[];
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    client_id: "",
    amount: "",
    currency: "INR",
    due_date: "",
    status: "not_started" as ProjectStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Project title is required."); return; }
    setSaving(true);
    try {
      const client = clients.find((c) => c.id === form.client_id);
      const payload: Omit<Project, "id"> = {
        user_id: uid,
        title: form.title.trim(),
        description: form.description.trim(),
        client_id: form.client_id || undefined,
        client_name: client?.name,
        amount: form.amount ? Number(form.amount) : undefined,
        currency: form.currency,
        status: form.status,
        due_date: form.due_date || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "projects"), payload);
      onCreated({ id: ref.id, ...payload });
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const fi = "w-full bg-slate-50 dark:bg-black/30 border border-gray-200 dark:border-gray-700/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-500/60 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800/60 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Project</h2>
            <p className="text-xs text-gray-500 mt-0.5">Track the status of a piece of work.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Project title *</label>
            <input className={fi} placeholder="e.g. Brand Identity Design" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Description</label>
            <textarea className={`${fi} resize-none`} rows={2} placeholder="What's this project about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Link to client</label>
              <select className={fi} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                <option value="">— None —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Initial status</label>
              <select className={fi} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Amount</label>
              <input className={fi} type="number" min={0} placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Due date</label>
              <input className={fi} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors disabled:opacity-60">
              {saving ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Project Card (board view) ─────────────────────────────────────────────────

function ProjectCard({
  project,
  onStatusChange,
  onDelete,
}: {
  project: Project;
  onStatusChange: (id: string, status: ProjectStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOverdue =
    project.due_date &&
    project.status !== "done" &&
    new Date(project.due_date) < new Date();

  return (
    <GlowCard customSize className="group space-y-3 hover:shadow-emerald-900/10 transition-all duration-200">
      {/* Title + menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug truncate">{project.title}</p>
          {project.client_name && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{project.client_name}</p>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all text-gray-400"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 w-44 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700/60 rounded-xl shadow-xl overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800/60">
                Move to
              </div>
              {COLUMNS.filter((c) => c.key !== project.status).map((c) => (
                <button
                  key={c.key}
                  onClick={() => { onStatusChange(project.id, c.key); setMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition-colors ${c.color}`}
                >
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  {c.label}
                </button>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-800/60">
                <button
                  onClick={() => { onDelete(project.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center justify-between">
        <StatusBadge status={project.status} />
        {project.amount ? (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {project.currency === "INR" ? "₹" : "$"}{Number(project.amount).toLocaleString("en-IN")}
          </span>
        ) : null}
      </div>

      {project.due_date && (
        <div className={`text-[10px] font-medium flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-gray-400"}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {isOverdue ? "Overdue · " : ""}
          {new Date(project.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      )}
    </GlowCard>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const router = useRouter();
  const { headerSearch } = useDashboardSearch();

  const [uid, setUid] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");

  const load = useCallback(async (userId: string) => {
    const [projSnap, clientSnap] = await Promise.all([
      getDocs(query(collection(db, "projects"), where("user_id", "==", userId))),
      getDocs(query(collection(db, "clients"), where("user_id", "==", userId))),
    ]);
    const list = projSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Project))
      .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
    setProjects(list);
    setClients(clientSnap.docs.map((d) => ({ id: d.id, name: d.data().client_name ?? "Client" })));
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/auth"); return; }
      setUid(user.uid);
      load(user.uid);
    });
    return () => unsub();
  }, [router, load]);

  const handleStatusChange = async (id: string, status: ProjectStatus) => {
    await updateDoc(doc(db, "projects", id), { status, updated_at: new Date().toISOString() });
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "projects", id));
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreated = (p: Project) => {
    setProjects((prev) => [p, ...prev]);
  };

  // Filter by global header search
  const filtered = projects.filter((p) => {
    if (!headerSearch.trim()) return true;
    const q = headerSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.client_name ?? "").toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q)
    );
  });

  // Stats
  const done = projects.filter((p) => p.status === "done").length;
  const inProgress = projects.filter((p) => p.status === "in_progress").length;
  const overdue = projects.filter(
    (p) => p.due_date && p.status !== "done" && new Date(p.due_date) < new Date()
  ).length;

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 pb-12 relative z-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-light text-slate-900 dark:text-white mb-1">Projects</h1>
            <p className="text-sm text-gray-500">Track work from idea to delivery.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Board / List toggle */}
            <div className="flex items-center bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800/60 rounded-lg p-0.5">
              {(["board", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                    view === v
                      ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                      : "text-gray-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New project
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "TOTAL",       value: projects.length, color: "text-slate-900 dark:text-white" },
            { label: "IN PROGRESS", value: inProgress,       color: "text-blue-600 dark:text-blue-400" },
            { label: "COMPLETED",   value: done,             color: "text-emerald-600 dark:text-emerald-400" },
            { label: "OVERDUE",     value: overdue,          color: overdue > 0 ? "text-red-500" : "text-gray-400" },
          ].map((s) => (
            <GlowCard key={s.label} customSize className="py-4">
              <p className="text-[10px] font-bold tracking-wider text-gray-500 mb-1.5">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </GlowCard>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <GlowCard customSize className="py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-slate-900 dark:text-white font-semibold mb-1">No projects yet</p>
            <p className="text-sm text-gray-500 mb-5">Create your first project to start tracking progress.</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors"
            >
              + New project
            </button>
          </GlowCard>
        )}

        {/* ── BOARD VIEW ── */}
        {!loading && projects.length > 0 && view === "board" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const colItems = filtered.filter((p) => p.status === col.key);
              return (
                <div key={col.key} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                    <span className="ml-auto text-xs text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                      {colItems.length}
                    </span>
                  </div>
                  <div className="space-y-3 min-h-[100px]">
                    {colItems.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-200 dark:border-gray-800/60 rounded-xl h-20 flex items-center justify-center">
                        <p className="text-xs text-gray-400">Empty</p>
                      </div>
                    ) : (
                      colItems.map((p) => (
                        <ProjectCard key={p.id} project={p} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {!loading && projects.length > 0 && view === "list" && (
          <GlowCard customSize>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800/60">
                    <th className="pb-3 pr-4 font-semibold">Project</th>
                    <th className="pb-3 pr-4 font-semibold">Client</th>
                    <th className="pb-3 pr-4 font-semibold text-center">Status</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Amount</th>
                    <th className="pb-3 pr-4 font-semibold">Due</th>
                    <th className="pb-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">No projects match your search.</td>
                    </tr>
                  )}
                  {filtered.map((p) => {
                    const isOverdue = p.due_date && p.status !== "done" && new Date(p.due_date) < new Date();
                    return (
                      <tr key={p.id} className="hover:bg-black/2 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-slate-900 dark:text-white">{p.title}</p>
                          {p.description && <p className="text-gray-400 mt-0.5 line-clamp-1">{p.description}</p>}
                        </td>
                        <td className="py-3 pr-4 text-gray-500">{p.client_name ?? "—"}</td>
                        <td className="py-3 pr-4 text-center"><StatusBadge status={p.status} /></td>
                        <td className="py-3 pr-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {p.amount ? `${p.currency === "INR" ? "₹" : "$"}${Number(p.amount).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className={`py-3 pr-4 ${isOverdue ? "text-red-400" : "text-gray-400"}`}>
                          {p.due_date ? new Date(p.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlowCard>
        )}
      </div>

      {showModal && uid && (
        <NewProjectModal
          uid={uid}
          clients={clients}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
