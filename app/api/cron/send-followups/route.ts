import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { reminderBody, reminderSubject, toneFromAttempt } from "@/lib/reminder-copy";

// POST /api/cron/send-followups
// Called daily by Vercel Cron. Secured by CRON_SECRET.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Get all unpaid, unpaused clients whose due_date has passed
    const clientsSnap = await adminDb
      .collection("clients")
      .where("paid", "==", false)
      .where("paused", "==", false)
      .get();

    const overdueClients = clientsSnap.docs.filter((d) => {
      const dueDate = d.data().due_date;
      return dueDate && dueDate < todayStr;
    });

    if (overdueClients.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "No overdue clients" });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const doc of overdueClients) {
      const client = doc.data();
      const uid = client.user_id;

      // Check user profile for credits and reminders enabled
      const profileSnap = await adminDb.collection("profiles").doc(uid).get();
      const profile = profileSnap.data();

      if (!profile || profile.credits <= 0 || profile.reminders_enabled === false) continue;

      // Check rate limit: only one email per client per 2 days
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const recentLogsSnap = await adminDb
        .collection("email_logs")
        .where("client_id", "==", doc.id)
        .where("sent_at", ">=", twoDaysAgo)
        .get();

      if (!recentLogsSnap.empty) continue;

      // Determine tone and attempt number
      const allLogsSnap = await adminDb
        .collection("email_logs")
        .where("client_id", "==", doc.id)
        .orderBy("sent_at", "desc")
        .get();

      const attemptNumber = allLogsSnap.size + 1;
      const tone = toneFromAttempt(attemptNumber);

      const senderEmail = profile.sender_email || "noreply@freelanceros.app";
      const paymentLink = profile.payment_link || "";

      const subject = reminderSubject(tone, profile.full_name || "your freelancer");
      const body = reminderBody({
        tone,
        clientName: client.client_name,
        work: client.work,
        currency: client.currency || "INR",
        amount: Number(client.amount),
        dueDate: client.due_date,
        paymentLink,
        freelancerName: profile.full_name || "Your Freelancer",
      });

      // Send via Resend
      try {
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
          errors.push(`${doc.id}: ${errText}`);
          continue;
        }
      } catch (e: unknown) {
        errors.push(`${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }

      // Log the reminder
      const logRef = adminDb.collection("email_logs").doc();
      await logRef.set({
        client_id: doc.id,
        user_id: uid,
        tone,
        attempt_number: attemptNumber,
        sent_at: now.toISOString(),
      });

      // Update client reminder stage
      await doc.ref.update({ reminder_stage: tone, updated_at: now.toISOString() });

      sent++;
    }

    return NextResponse.json({ ok: true, sent, errors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
