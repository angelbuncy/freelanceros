"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useDashboardSearch, useThemeToggle } from "@/components/providers/app-providers";
import { DynamicBackground } from "@/components/ui/background-paper-shaders";
import { AnimatedGlowingSearchBar } from "@/components/ui/animated-glowing-search-bar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [credits, setCredits] = useState<number>(0);
  const [mounted, setMounted] = useState(false); // Track mounting to prevent hydration flickers
  const { headerSearch, setHeaderSearch } = useDashboardSearch();
  const { theme, toggleTheme } = useThemeToggle();

  const router = useRouter();
  const pathname = usePathname();

  // 1. Set mounted to true once client-side code runs
  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }

      // Safe name parsing
      const name = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "User";
      setUserName(name);

      try {
        const profileDoc = await getDoc(doc(db, "profiles", user.uid));
        if (profileDoc.exists()) {
          setCredits(profileDoc.data().credits ?? 0);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      await fetch("/api/auth", { method: "DELETE" });
      router.push("/auth");
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { href: "/clients", label: "Clients", icon: <ClientsIcon /> },
    { href: "/projects", label: "Projects", icon: <ProjectsIcon /> },
    { href: "/payments", label: "Payments", icon: <PaymentsIcon /> },
    { href: "/reminders", label: "Reminders", icon: <RemindersIcon /> },
    { href: "/email-templates", label: "Email templates", icon: <MailIcon /> },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Optional: Prevent flash of unstyled/default content by returning null or a loader 
  // until the component has mounted on the client.
  if (!mounted) return <div className="h-screen bg-slate-50 dark:bg-[#04060a]" />;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-[#04060a] dark:text-gray-200 overflow-hidden font-sans relative">
      {/* ── Dynamic WebGL background — auto dark/light via MeshGradient shader ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <DynamicBackground />
      </div>
      {/* SIDEBAR */}
      <aside
        className={`${isCollapsed ? "w-20" : "w-64"
          } transition-all duration-300 border-r border-gray-200 dark:border-gray-800/40 bg-white/85 dark:bg-[#0d1117]/75 backdrop-blur-xl flex flex-col justify-between py-6 relative z-30 shrink-0`}
      >
        <div className="space-y-8">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "px-6"} gap-3 transition-all overflow-hidden`}>
            <div className="w-5 h-5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            {!isCollapsed && <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">FreelancerOS</span>}
          </div>

          <nav className="space-y-1 px-3">
            {!isCollapsed && <div className="text-xs font-semibold text-gray-500 mb-4 px-3 tracking-wider">MENU</div>}
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isCollapsed ? "justify-center" : ""
                  } ${
                    isActive(item.href)
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                {item.icon}
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-1 px-3">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isCollapsed ? "justify-center" : ""} ${
              pathname === "/settings"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                : "text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <SettingsIcon />
            {!isCollapsed && <span className="whitespace-nowrap">Settings</span>}
          </Link>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 text-gray-500 dark:text-gray-400 transition-colors ${isCollapsed ? "justify-center" : ""}`}
          >
            <SignOutIcon />
            {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col relative z-20 min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200/80 dark:border-gray-800/50 bg-white/75 dark:bg-[#0d1117]/55 backdrop-blur-md shrink-0">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 -ml-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0">
              <MenuIcon />
            </button>
            <div className="hidden min-w-0 flex-1 sm:flex sm:max-w-xl md:max-w-2xl">
              <AnimatedGlowingSearchBar
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Filter clients (name, email, work)…"
                aria-label="Filter clients"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-black/5 dark:bg-black/20 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800/50">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                {credits} Credits
              </div>
              <Link
                href="/billing"
                title="Buy more credits"
                className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            </div>
            <Link href="/settings" className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-200 dark:border-gray-800/50 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{userName}</div>
                <div className="text-[10px] text-gray-500 uppercase">Freelancer</div>
              </div>
            </Link>
          </div>
        </header>
        <main className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}

// Icons extracted for readability
const DashboardIcon = () => <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const ClientsIcon = () => <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const PaymentsIcon = () => <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const RemindersIcon = () => <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SettingsIcon = () => <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const SignOutIcon = () => <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const MenuIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>;
const SunIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const ProjectsIcon = () => <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const MailIcon = () => <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;