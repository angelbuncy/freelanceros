import { NextRequest, NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/firebase/admin";

// GET /api/clients
export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb
    .collection("clients")
    .where("user_id", "==", user.uid)
    .orderBy("created_at", "desc")
    .get();

  const clients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ clients });
}

// POST /api/clients
export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { client_name, client_email, work, amount, currency, due_date, notes, client_phone } = body;

  if (!client_name || !client_email || !work || !amount || !due_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check and deduct credits
  const profileRef = adminDb.collection("profiles").doc(user.uid);
  const profileSnap = await profileRef.get();
  const credits = profileSnap.data()?.credits ?? 0;

  if (credits <= 0) {
    return NextResponse.json({ error: "Insufficient credits. Please buy more." }, { status: 402 });
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
      notes: typeof notes === "string" ? notes : "",
      client_phone: typeof client_phone === "string" ? client_phone : "",
      created_at: now,
      updated_at: now,
    });
    t.update(profileRef, { credits: credits - 1 });
  });

  return NextResponse.json({ client_id: clientRef.id }, { status: 201 });
}
