import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, getServerUser } from "@/lib/firebase/admin";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/clients/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "paid",
    "paused",
    "status",
    "reminder_stage",
    "firm_approved",
    "final_approved",
    "notes",
    "client_phone",
    "client_name",
    "client_email",
    "work",
    "amount",
    "currency",
    "due_date",
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  if (body.amount !== undefined) updates.amount = Number(body.amount);
  if (body.paid === true) {
    updates.status = "paid";
    updates.paid_at = new Date().toISOString();
  }
  if (body.paid === false) {
    updates.paid_at = FieldValue.delete();
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const docRef = adminDb.collection("clients").doc(id);
  const snap = await docRef.get();

  if (!snap.exists || snap.data()?.user_id !== user.uid) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await docRef.update(updates);
  return NextResponse.json({ client: { id, ...snap.data(), ...updates } });
}

// DELETE /api/clients/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const docRef = adminDb.collection("clients").doc(id);
  const snap = await docRef.get();

  if (!snap.exists || snap.data()?.user_id !== user.uid) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await docRef.delete();
  return NextResponse.json({ ok: true });
}
