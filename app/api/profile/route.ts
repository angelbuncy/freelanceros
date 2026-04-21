import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth, getServerUser } from "@/lib/firebase/admin";

// GET /api/profile
export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profileSnap = await adminDb.collection("profiles").doc(user.uid).get();
  const profile = profileSnap.exists ? profileSnap.data() : null;

  const authUser = await adminAuth.getUser(user.uid);

  return NextResponse.json({
    profile: profile ?? null,
    credits: profile?.credits ?? 0,
    user: {
      id: user.uid,
      email: authUser.email,
      name: authUser.displayName,
    },
  });
}

// PATCH /api/profile
export async function PATCH(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowedFields = ["full_name", "sender_email", "sender_domain", "payment_link", "reminders_enabled"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  const profileRef = adminDb.collection("profiles").doc(user.uid);
  const snap = await profileRef.get();

  if (!snap.exists) {
    await profileRef.set({ id: user.uid, ...updates });
  } else {
    await profileRef.update(updates);
  }

  const updated = await profileRef.get();
  return NextResponse.json({ profile: updated.data() });
}
