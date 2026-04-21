import { NextRequest, NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/firebase/admin";
import { reminderBody, reminderSubject, toneFromAttempt, type ReminderTone } from "@/lib/reminder-copy";

type Body = {
  client_id: string;
  /** Skip 2-day rate limit (manual send from UI). */
  force?: boolean;
  /** Return subject/body JSON only; no send. */
  preview?: boolean;
  /** Override tone (optional; default derived from attempt count). */
  tone?: ReminderTone;
};

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed: Body;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { client_id, force, preview, tone: toneOverride } = parsed;
  if (!client_id) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const clientRef = adminDb.collection("clients").doc(client_id);
  const clientSnap = await clientRef.get();
  if (!clientSnap.exists || clientSnap.data()?.user_id !== user.uid) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const client = clientSnap.data()!;
  if (client.paid === true) {
    return NextResponse.json({ error: "Client is already paid" }, { status: 400 });
  }
  if (client.paused === true) {
    return NextResponse.json({ error: "Reminders are paused for this client" }, { status: 400 });
  }

  const profileSnap = await adminDb.collection("profiles").doc(user.uid).get();
  const profile = profileSnap.data();

  if (!preview && (!profile || profile.credits <= 0)) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }
  if (!preview && profile?.reminders_enabled === false) {
    return NextResponse.json({ error: "Reminders are disabled in settings" }, { status: 400 });
  }

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

  if (!force && !preview) {
    const recentLogsSnap = await adminDb
      .collection("email_logs")
      .where("client_id", "==", client_id)
      .where("sent_at", ">=", twoDaysAgo)
      .get();
    if (!recentLogsSnap.empty) {
      return NextResponse.json(
        { error: "A reminder was sent in the last 2 days. Use force to send anyway." },
        { status: 429 }
      );
    }
  }

  const allLogsSnap = await adminDb
    .collection("email_logs")
    .where("client_id", "==", client_id)
    .orderBy("sent_at", "desc")
    .get();

  const attemptNumber = allLogsSnap.size + 1;
  const tone: ReminderTone = toneOverride ?? toneFromAttempt(attemptNumber);

  const freelancerName = profile?.full_name || "Your Freelancer";
  const senderEmail = profile?.sender_email || "noreply@freelanceros.app";
  const paymentLink = profile?.payment_link || "";

  const subject = reminderSubject(tone, freelancerName);
  const body = reminderBody({
    tone,
    clientName: client.client_name,
    work: client.work,
    currency: client.currency || "INR",
    amount: Number(client.amount),
    dueDate: client.due_date,
    paymentLink,
    freelancerName,
  });

  if (preview) {
    return NextResponse.json({ subject, body, tone, attempt_number: attemptNumber });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
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

  const logRef = adminDb.collection("email_logs").doc();
  await logRef.set({
    client_id,
    user_id: user.uid,
    tone,
    attempt_number: attemptNumber,
    sent_at: now.toISOString(),
  });

  await clientRef.update({ reminder_stage: tone, updated_at: now.toISOString() });

  return NextResponse.json({ ok: true, tone, attempt_number: attemptNumber });
}
