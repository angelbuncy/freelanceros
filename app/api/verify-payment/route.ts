import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

type VerifyPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  user_id: string;
  credits: number;
};

export async function POST(request: NextRequest) {
  try {
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    const authHeader = request.headers.get("authorization");

    if (!razorpaySecret) {
      return NextResponse.json({ error: "Server payment configuration is incomplete" }, { status: 500 });
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const payload = (await request.json()) as VerifyPayload;

    if (
      !payload?.razorpay_order_id ||
      !payload?.razorpay_payment_id ||
      !payload?.razorpay_signature ||
      !payload?.user_id ||
      !payload?.credits
    ) {
      return NextResponse.json({ error: "Missing required payment fields" }, { status: 400 });
    }

    // Verify the Firebase ID token from the Authorization header
    const idToken = authHeader.replace("Bearer ", "").trim();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Invalid user token" }, { status: 401 });
    }

    if (decodedToken.uid !== payload.user_id) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 401 });
    }

    // Verify Razorpay signature
    const body = `${payload.razorpay_order_id}|${payload.razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", razorpaySecret).update(body).digest("hex");

    if (expected !== payload.razorpay_signature) {
      return NextResponse.json({ error: "Invalid Razorpay signature" }, { status: 401 });
    }

    // Check idempotency: has this payment already been processed?
    const paymentRef = adminDb.collection("processed_payments").doc(payload.razorpay_payment_id);
    const paymentSnap = await paymentRef.get();

    if (paymentSnap.exists) {
      return NextResponse.json({ ok: true, message: "Payment already processed" }, { status: 200 });
    }

    // Add credits to user profile in a transaction
    const profileRef = adminDb.collection("profiles").doc(payload.user_id);

    await adminDb.runTransaction(async (t) => {
      t.set(paymentRef, {
        payment_id: payload.razorpay_payment_id,
        user_id: payload.user_id,
        order_id: payload.razorpay_order_id,
        credits: Number(payload.credits),
        created_at: new Date().toISOString(),
      });

      const profileSnap = await t.get(profileRef);
      const currentCredits = profileSnap.data()?.credits ?? 0;
      t.update(profileRef, { credits: currentCredits + Number(payload.credits) });
    });

    return NextResponse.json({ ok: true, message: "Payment verified" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify payment" },
      { status: 500 }
    );
  }
}
