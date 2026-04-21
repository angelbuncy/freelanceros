import { NextRequest, NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/firebase/admin";

type Params = { params: Promise<{ id: string }> };

// POST /api/invoices/[id]/paid
export async function POST(_request: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const docRef = adminDb.collection("clients").doc(id);
  const snap = await docRef.get();

  if (!snap.exists || snap.data()?.user_id !== user.uid) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  await docRef.update({ paid: true, status: "paid", updated_at: new Date().toISOString() });

  return NextResponse.json({ ok: true, invoice: { id, ...snap.data(), paid: true, status: "paid" } });
}
