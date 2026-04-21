import { NextRequest, NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/firebase/admin";
import { reminderBody, reminderSubject, toneFromAttempt } from "@/lib/reminder-copy";

function digitsForWa(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.length >= 10) return d;
  return null;
}

// POST — send via Twilio WhatsApp if configured, else return wa.me link + preview text
export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const client_id = body.client_id as string;
  if (!client_id) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const clientRef = adminDb.collection("clients").doc(client_id);
  const clientSnap = await clientRef.get();
  if (!clientSnap.exists || clientSnap.data()?.user_id !== user.uid) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const client = clientSnap.data()!;
  const phoneRaw = String(client.client_phone || "").trim();
  const digits = digitsForWa(phoneRaw);
  if (!digits) {
    return NextResponse.json(
      { error: "Add a phone number on the client (with country code) to use WhatsApp." },
      { status: 400 }
    );
  }

  const profileSnap = await adminDb.collection("profiles").doc(user.uid).get();
  const profile = profileSnap.data();
  const freelancerName = profile?.full_name || "Your Freelancer";
  const paymentLink = profile?.payment_link || "";

  const allLogsSnap = await adminDb
    .collection("email_logs")
    .where("client_id", "==", client_id)
    .orderBy("sent_at", "desc")
    .get();
  const attemptNumber = allLogsSnap.size + 1;
  const tone = toneFromAttempt(attemptNumber);

  const subject = reminderSubject(tone, freelancerName);
  const textBody = reminderBody({
    tone,
    clientName: client.client_name,
    work: client.work,
    currency: client.currency || "INR",
    amount: Number(client.amount),
    dueDate: client.due_date,
    paymentLink,
    freelancerName,
  });

  const fullMessage = `${subject}\n\n${textBody}`;
  const waLink = `https://wa.me/${digits}?text=${encodeURIComponent(fullMessage)}`;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = `whatsapp:+${digits}`;

  if (sid && token && from) {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const formData = new URLSearchParams();
    formData.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
    formData.set("To", to.startsWith("whatsapp:") ? to : `whatsapp:+${digits}`);
    formData.set("Body", fullMessage);

    const tw = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!tw.ok) {
      const err = await tw.text();
      return NextResponse.json({ error: err || "Twilio request failed", waLink }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent: true, waLink });
  }

  return NextResponse.json({ ok: true, sent: false, waLink, message: "Open link to send in WhatsApp (Twilio not configured)." });
}
