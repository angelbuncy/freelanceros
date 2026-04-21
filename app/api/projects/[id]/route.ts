import { NextRequest, NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/firebase/admin";

const STATUSES = ["not_started", "in_progress", "review", "done"] as const;
type Status = (typeof STATUSES)[number];

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.description === "string") updates.description = body.description;
  if (typeof body.client_id === "string") updates.client_id = body.client_id;
  if (body.status !== undefined) {
    const st = body.status as Status;
    if (!STATUSES.includes(st)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = st;
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const docRef = adminDb.collection("projects").doc(id);
  const snap = await docRef.get();
  if (!snap.exists || snap.data()?.user_id !== user.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await docRef.update(updates);
  return NextResponse.json({ ok: true, id, ...updates });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const docRef = adminDb.collection("projects").doc(id);
  const snap = await docRef.get();
  if (!snap.exists || snap.data()?.user_id !== user.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await docRef.delete();
  return NextResponse.json({ ok: true });
}
