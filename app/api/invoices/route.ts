import { NextRequest, NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/firebase/admin";

// GET /api/invoices
export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb
    .collection("clients")
    .where("user_id", "==", user.uid)
    .orderBy("due_date", "asc")
    .get();

  type InvoiceDoc = { id: string; paid?: boolean; amount?: number; [key: string]: unknown };
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InvoiceDoc[];

  const pending = data.filter((c) => !c.paid);
  const paid = data.filter((c) => c.paid);
  const totalPending = pending.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaid = paid.reduce((sum, c) => sum + Number(c.amount), 0);

  return NextResponse.json({
    invoices: data,
    summary: {
      pending_count: pending.length,
      paid_count: paid.length,
      total_pending: totalPending,
      total_paid: totalPaid,
    },
  });
}

// POST /api/invoices — alias for creating a client
export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { client_name, client_email, work, amount, currency, due_date } = body;

  if (!client_name || !client_email || !work || !amount || !due_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const profileRef = adminDb.collection("profiles").doc(user.uid);
  const profileSnap = await profileRef.get();
  const credits = profileSnap.data()?.credits ?? 0;

  if (credits <= 0) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const clientRef = adminDb.collection("clients").doc();
  const now = new Date().toISOString();

  await adminDb.runTransaction(async (t) => {
    t.set(clientRef, {
      user_id: user.uid,
      client_name,
      client_email,
      work,
      amount: Number(amount),
      currency: currency ?? "INR",
      due_date,
      paid: false,
      paused: false,
      reminder_stage: "polite",
      created_at: now,
      updated_at: now,
    });
    t.update(profileRef, { credits: credits - 1 });
  });

  return NextResponse.json({ invoice_id: clientRef.id }, { status: 201 });
}
