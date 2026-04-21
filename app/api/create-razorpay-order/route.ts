import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.replace("Bearer ", "").trim();
    await adminAuth.verifyIdToken(idToken);

    const { amount, credits } = await request.json();
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpaySecret) {
      return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 });
    }

    const credentials = Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString("base64");

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        amount: amount * 100, // paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: { credits: String(credits) },
      }),
    });

    if (!rzpRes.ok) {
      const err = await rzpRes.text();
      return NextResponse.json({ error: `Razorpay error: ${err}` }, { status: 502 });
    }

    const order = await rzpRes.json();
    return NextResponse.json({ order_id: order.id, amount: order.amount, key: razorpayKeyId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
