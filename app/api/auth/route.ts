import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Determine the cookie expiration (5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // Create the session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set("session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    console.error("Auth Session Error:", error);
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return NextResponse.json({ success: true });
}
