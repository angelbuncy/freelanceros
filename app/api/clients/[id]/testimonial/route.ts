import { NextRequest, NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/firebase/admin";

type Params = { params: Promise<{ id: string }> };

// POST — send thank-you + review request email (after payment)
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const clientRef = adminDb.collection("clients").doc(id);
  const snap = await clientRef.get();
  if (!snap.exists || snap.data()?.user_id !== user.uid) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const client = snap.data()!;
  if (!client.paid) {
    return NextResponse.json({ error: "Client is not marked as paid" }, { status: 400 });
  }

  const profileSnap = await adminDb.collection("profiles").doc(user.uid).get();
  const profile = profileSnap.data();
  const name = profile?.full_name || "Your freelancer";
  const senderEmail = profile?.sender_email || "noreply@freelanceros.app";

  const reviewUrl = profile?.payment_link || "https://www.google.com/search?q=leave+a+review";
  const subject = `Thank you — quick favor?`;
  const body = `Hi ${client.client_name},\n\nThank you for settling the invoice for "${client.work}". It means a lot.\n\nIf you have a minute, I'd really appreciate a short review — it helps other clients find me:\n${reviewUrl}\n\nThanks again,\n${name}`;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured", preview: { subject, body } }, { status: 503 });
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: senderEmail,
      to: client.client_email,
      subject,
      text: body,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    return NextResponse.json({ error: errText || "Resend failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
