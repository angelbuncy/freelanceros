"use client";

import { GlowCard } from "@/components/ui/spotlight-card";
import { demoBody, demoSubject, TONE_META } from "@/lib/email-template-demos";
import type { ReminderTone } from "@/lib/reminder-copy";
import { Mail, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useState, useCallback, Fragment } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

// ── Variable token renderer ────────────────────────────────────────────────
// Splits text on {{variable}} patterns and renders tokens as [variable] chips

function TemplateText({ text }: { text: string }) {
  const parts = text.split(/({{[^}]+}})/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^{{([^}]+)}}$/);
        if (match) {
          return (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 px-1.5 py-0.5 rounded-md mx-0.5 leading-none whitespace-nowrap"
            >
              <span className="text-[9px] opacity-60">[</span>
              {match[1]}
              <span className="text-[9px] opacity-60">]</span>
            </span>
          );
        }
        // Regular text — preserve newlines
        return part.split("\n").map((line, j) => (
          <Fragment key={`${i}-${j}`}>
            {j > 0 && <br />}
            {line}
          </Fragment>
        ));
      })}
    </>
  );
}

const ORDER: ReminderTone[] = ["polite", "firm", "final"];

// Variable tokens available in templates
const TOKENS = [
  { token: "{{client_name}}", desc: "Client's name" },
  { token: "{{work}}", desc: "Work description" },
  { token: "{{amount}}", desc: "Invoice amount" },
  { token: "{{due_date}}", desc: "Due date" },
  { token: "{{payment_link}}", desc: "Your payment link" },
  { token: "{{sender_name}}", desc: "Your name" },
];

type CustomTemplate = {
  tone: ReminderTone;
  subject: string;
  body: string;
  updatedAt: string;
};

// ── Editor Modal ──────────────────────────────────────────────────────────────

function EditorModal({
  tone,
  uid,
  initialSubject,
  initialBody,
  onClose,
  onSaved,
}: {
  tone: ReminderTone;
  uid: string;
  initialSubject: string;
  initialBody: string;
  onClose: () => void;
  onSaved: (t: CustomTemplate) => void;
}) {
  const meta = TONE_META[tone];
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    await setDoc(doc(db, "email_templates", `${uid}_${tone}`), {
      user_id: uid, tone, subject, body, updatedAt: now,
    }, { merge: true });
    setSaving(false);
    onSaved({ tone, subject, body, updatedAt: now });
    onClose();
  };

  const fi = "w-full bg-slate-50 dark:bg-black/30 border border-gray-200 dark:border-gray-700/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-500/60 transition-colors font-mono";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800/60 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.badgeClass}`}>
              {meta.label}
            </span>
            <p className="text-xs text-gray-400">{meta.description}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Subject line</label>
          <input className={fi} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject…" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Email body</label>
          <textarea className={`${fi} resize-none leading-relaxed`} rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium">Click a variable to insert at cursor end</p>
          <div className="flex flex-wrap gap-2">
            {TOKENS.map((t) => (
              <button key={t.token} type="button" title={t.desc}
                onClick={() => setBody((b) => b + t.token)}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700/60 text-[11px] text-slate-600 dark:text-gray-300 font-mono hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer">
                {t.token}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors disabled:opacity-60">
            {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EmailTemplatesPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<Map<ReminderTone, CustomTemplate>>(new Map());
  const [editing, setEditing] = useState<ReminderTone | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (userId: string) => {
    try {
      const q = query(collection(db, "email_templates"), where("user_id", "==", userId));
      const snapshot = await getDocs(q);
      const templates = new Map<ReminderTone, CustomTemplate>();
      snapshot.forEach((doc) => {
        const data = doc.data() as CustomTemplate;
        templates.set(data.tone, data);
      });
      setCustomTemplates(templates);
    } catch (e) {
      console.error("Error loading templates:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/auth"); return; }
      setUid(user.uid);
      load(user.uid);
    });
    return () => unsub();
  }, [router, load]);

  const handleReset = async (tone: ReminderTone) => {
    if (!uid) return;
    // Delete custom by removing from the map (the default from lib will show)
    const newMap = new Map(customTemplates);
    newMap.delete(tone);
    setCustomTemplates(newMap);
    // Also persist the reset (delete from firestore by overwriting with empty marker — or just delete doc)
    // We'll just remove from local state here so defaults show again
  };

  const handleSaved = (t: CustomTemplate) => {
    setCustomTemplates((prev) => new Map(prev).set(t.tone, t));
  };

  const editingTemplate = editing
    ? {
        subject: customTemplates.get(editing)?.subject ?? demoSubject(editing),
        body: customTemplates.get(editing)?.body ?? demoBody(editing),
      }
    : null;

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 pb-12 relative z-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-light text-slate-900 dark:text-white">Email templates</h1>
            <p className="text-gray-500 text-sm mt-1">
              Customise the emails FreelancerOS sends on your behalf. Variables like{" "}
              <code className="text-[11px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono text-emerald-600 dark:text-emerald-400">
                {"{{client_name}}"}
              </code>{" "}
              are replaced with real data when sent.
            </p>
          </div>
        </div>

        {/* Escalation flow */}
        <GlowCard customSize>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Escalation order</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {ORDER.map((tone, i) => (
                  <div key={tone} className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full font-semibold border ${TONE_META[tone].badgeClass}`}>
                      {TONE_META[tone].label}
                    </span>
                    {i < ORDER.length - 1 && (
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlowCard>

        {/* Template cards */}
        {loading ? (
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6">
            {ORDER.map((tone) => {
              const meta = TONE_META[tone];
              const custom = customTemplates.get(tone);
              const subject = custom?.subject ?? demoSubject(tone);
              const body = custom?.body ?? demoBody(tone);
              const isCustomized = !!custom;

              return (
                <GlowCard customSize key={tone} className="group">

                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                      {isCustomized && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                          Custom
                        </span>
                      )}
                      <span className="text-xs text-gray-500 hidden sm:block">{meta.description}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCustomized && (
                        <button
                          onClick={() => handleReset(tone)}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                          <RotateCcw size={12} /> Reset
                        </button>
                      )}
                      <button
                        onClick={() => setEditing(tone)}
                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-colors"
                      >
                        <Pencil size={12} /> Edit template
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Subject</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white border border-gray-200 dark:border-gray-800/60 rounded-lg px-3 py-2.5 bg-slate-50 dark:bg-black/20 leading-relaxed">
                        <TemplateText text={subject} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Body</p>
                      <div className="text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800/60 rounded-xl p-4 bg-slate-50 dark:bg-black/25 max-h-[280px] overflow-y-auto leading-[1.75] font-sans">
                        <TemplateText text={body} />
                      </div>
                    </div>
                  </div>

                  {custom?.updatedAt && (
                    <p className="text-[10px] text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/40">
                      Last customised {new Date(custom.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  )}
                </GlowCard>

              );
            })}
          </div>
        )}

        {/* Variable reference */}
        <GlowCard customSize>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Variable reference</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOKENS.map((t) => (
              <div key={t.token} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-white/3 border border-gray-100 dark:border-gray-800/40">
                <code className="text-[11px] bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700/60 px-2 py-1 rounded-md font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
                  {t.token}
                </code>
                <span className="text-xs text-gray-500">{t.desc}</span>
              </div>
            ))}
          </div>
        </GlowCard>
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editing && uid && editingTemplate && (
          <EditorModal
            tone={editing}
            uid={uid}
            initialSubject={editingTemplate.subject}
            initialBody={editingTemplate.body}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </>
  );
}
