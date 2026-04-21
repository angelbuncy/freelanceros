import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 text-center">
        <h1 className="text-2xl font-light">Authentication failed</h1>
        <p className="text-sm text-slate-300">
          The sign-in confirmation link is invalid or expired.
        </p>
        <Link
          href="/auth"
          className="inline-block rounded-xl bg-white px-5 py-2 text-black hover:bg-emerald-500 transition"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
