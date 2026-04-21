"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { app, auth, db } from "@/lib/firebase/client";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import PremiumBackdrop from "@/components/ui/premium-backdrop";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const urlError = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("error") : null;

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  async function handleCreateSession(idToken: string) {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      throw new Error("Failed to create session");
    }
  }

  async function createProfileRecord(uid: string, profileData: { email: string; name: string }) {
    const docRef = doc(db, "profiles", uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        id: uid,
        email: profileData.email,
        full_name: profileData.name,
        credits: 3, // default free credits
        receive_emails: true,
      });
    }
  }

  async function handleSignup() {
    if (!email || !password || !name) {
      setError("Name, email and password are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });
      
      // Create user profile in Firestore
      await createProfileRecord(user.uid, { email, name });

      const idToken = await user.getIdToken();
      await handleCreateSession(idToken);
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
      setLoading(false);
    }
  }

  async function handleLoginWithPassword() {
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      await handleCreateSession(idToken);
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed.");
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Initialize profile if it doesn't exist
      await createProfileRecord(userCredential.user.uid, { 
        email: userCredential.user.email || "", 
        name: userCredential.user.displayName || "User" 
      });

      const idToken = await userCredential.user.getIdToken();
      await handleCreateSession(idToken);
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Google auth failed.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center text-white px-6 overflow-hidden">
      <PremiumBackdrop />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md space-y-6 rounded-3xl border border-white/15 bg-black/45 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md"
      >
        <h1 className="text-3xl font-light text-center">
          {mode === "signup" ? "Welcome." : "Welcome back."}
        </h1>

        {urlError === "unauthorized" && (
          <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
            Please log in to continue.
          </p>
        )}

        {mode === "signup" && (
          <input
            placeholder="Your name"
            className="w-full p-4 bg-white/5 rounded-xl border border-transparent focus:border-emerald-400/60 focus:outline-none transition"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          placeholder="Email"
          className="w-full p-4 bg-white/5 rounded-xl border border-transparent focus:border-emerald-400/60 focus:outline-none transition"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-4 bg-white/5 rounded-xl border border-transparent focus:border-emerald-400/60 focus:outline-none transition"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <motion.button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-white text-black py-4 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-400 transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 font-medium"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.99 }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.8 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.1 0-.6-.1-1-.2-1.4H12z"
            />
          </svg>
          Continue with Google
        </motion.button>

        <button
          onClick={mode === "signup" ? handleSignup : handleLoginWithPassword}
          disabled={loading}
          className="w-full bg-white text-black py-4 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-500 transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Login with password"}
        </button>

        <button
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          disabled={loading}
          className="text-sm text-slate-400 w-full disabled:opacity-60"
        >
          {mode === "signup" ? "Already have an account? Login" : "New here? Create account"}
        </button>
      </motion.div>
    </div>
  );
}
