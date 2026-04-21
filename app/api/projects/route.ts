import { NextRequest, NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/firebase/admin";

const STATUSES = ["not_started", "in_progress", "review", "done"] as const;

export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb.collection("projects").where("user_id", "==", user.uid).get();

  type P = { id: string; updated_at?: string };
  const projects = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as P))
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, client_id, status } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const st = STATUSES.includes(status) ? status : "not_started";
  const now = new Date().toISOString();
  const ref = adminDb.collection("projects").doc();

  await ref.set({
    user_id: user.uid,
    title: title.trim(),
    description: typeof description === "string" ? description : "",
    client_id: typeof client_id === "string" ? client_id : "",
    status: st,
    created_at: now,
    updated_at: now,
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
