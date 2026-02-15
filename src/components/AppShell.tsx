"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/src/components/Button";
import { seedSampleData } from "@/src/lib/sampleData";
import { clearLabLensData, loadDemoMode, setDemoMode as persistDemoMode } from "@/src/lib/storage";

const DEMO_VISUAL_KEY = "lablens.demoVisualEnabled";
const THEME_KEY = "lablens.theme";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/new-report", label: "New Report" },
  { href: "/history", label: "History" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitialDemoState() {
  const persistedMode = loadDemoMode();
  const persistedVisual =
    typeof window !== "undefined" && window.localStorage.getItem(DEMO_VISUAL_KEY) === "true";

  if (!persistedVisual && persistedMode === "sample") {
    clearLabLensData();
    persistDemoMode("none");
    return { demoMode: "none" as const, demoVisualEnabled: false };
  }

  return {
    demoMode: persistedMode,
    demoVisualEnabled: persistedVisual && persistedMode === "sample",
  };
}

function getInitialTheme() {
  if (typeof window === "undefined") return "light" as const;
  return window.localStorage.getItem(THEME_KEY) === "dark" ? ("dark" as const) : ("light" as const);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const [initialDemoState] = useState(getInitialDemoState);
  const [demoMode, setDemoMode] = useState<"sample" | "none">(initialDemoState.demoMode);
  const [demoVisualEnabled, setDemoVisualEnabled] = useState(initialDemoState.demoVisualEnabled);
  const [demoBusy, setDemoBusy] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const isDemoActive = demoVisualEnabled && demoMode === "sample";
  const isMenuOpen = menuOpen && menuPath === pathname;

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === "lablens.demoMode" || event.key === DEMO_VISUAL_KEY || event.key === THEME_KEY) {
        setDemoMode(loadDemoMode());
        setDemoVisualEnabled(window.localStorage.getItem(DEMO_VISUAL_KEY) === "true");
        const nextTheme = window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
        setTheme(nextTheme);
        document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
      }
    };
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-lg ${
          isDemoActive
            ? "border-teal-300 bg-[linear-gradient(90deg,rgba(13,148,136,0.14)_0%,rgba(240,253,250,0.82)_45%,rgba(255,255,255,0.78)_100%)]"
            : "border-[var(--line)] bg-[var(--glass)]"
        }`}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-transparent px-1 py-1 transition-all duration-200 motion-safe:hover:scale-105 hover:border-teal-300 hover:bg-teal-50/70 active:border-teal-400 active:bg-teal-100 focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2"
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="url(#lensFill)"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="drop-shadow-[0_6px_10px_rgba(20,184,166,0.25)]"
                >
                  <defs>
                    <linearGradient id="lensFill" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#14b8a6" stopOpacity="0.3" />
                      <stop offset="1" stopColor="#22d3ee" stopOpacity="0.08" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="9" stroke="#0d9488" strokeWidth="2" />
                  <circle cx="9" cy="9" r="1.3" fill="#14b8a6" fillOpacity="0.75" />
                  <path
                    d="M6.5 14.2l3.2-2.9 2.1 2 4.7-5.1"
                    stroke="#0f766e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xl font-semibold tracking-tight text-[var(--ink)]">
                  Lab<span className="font-bold text-[var(--brand)]">Lens</span>
                </span>
              </Link>
              {isDemoActive ? (
                <span className="inline-flex h-7 items-center rounded-full border border-teal-400 bg-teal-100 px-2.5 text-xs font-bold tracking-[0.08em] text-teal-900">
                  DEMO MODE
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="h-9 px-3 text-sm"
                onClick={() => {
                  const nextTheme = theme === "dark" ? "light" : "dark";
                  setTheme(nextTheme);
                  document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
                  window.localStorage.setItem(THEME_KEY, nextTheme);
                }}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </Button>
              <Button
                variant="secondary"
                className="h-9 px-3 text-sm"
                disabled={demoBusy}
                onClick={async () => {
                  if (demoBusy) return;
                  if (isDemoActive) {
                    clearLabLensData();
                    persistDemoMode("none");
                    window.localStorage.setItem(DEMO_VISUAL_KEY, "false");
                    setDemoMode("none");
                    setDemoVisualEnabled(false);
                    setMenuOpen(false);
                    window.location.assign(pathname || "/");
                    return;
                  }
                  setDemoBusy(true);
                  try {
                    await seedSampleData();
                    window.localStorage.setItem(DEMO_VISUAL_KEY, "true");
                    setDemoVisualEnabled(true);
                    setDemoMode("sample");
                    setMenuOpen(false);
                    window.location.assign(pathname || "/");
                  } catch (error) {
                    console.error("Failed to seed demo data:", error);
                    setDemoBusy(false);
                  }
                }}
              >
                {demoBusy ? "Loading..." : isDemoActive ? "Exit Demo" : "Demo"}
              </Button>
              <button
                type="button"
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMenuOpen}
                aria-controls="primary-dropdown-menu"
                onClick={() =>
                  setMenuOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setMenuPath(pathname);
                    }
                    return next;
                  })
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink)] motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="relative">
            {isMenuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-40 bg-transparent"
                />
                <nav
                  id="primary-dropdown-menu"
                  aria-label="Primary"
                  className="absolute right-0 top-3 z-50 w-[min(18rem,92vw)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
                >
                  <ul className="space-y-1">
                    {tabs.map((tab) => {
                      const active = isActive(pathname, tab.href);
                      return (
                        <li key={tab.href}>
                          <Link
                            href={tab.href}
                            onClick={() => setMenuOpen(false)}
                            className={`inline-flex h-10 w-full items-center rounded-xl border px-3 text-sm font-semibold motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                              active
                                ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                                : "border-transparent bg-[var(--surface-strong)] text-[var(--ink-soft)] hover:border-teal-200 hover:bg-teal-50 hover:text-[var(--ink)]"
                            }`}
                          >
                            {tab.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="px-3 pb-1 pt-2 text-xs font-medium text-[var(--ink-soft)]">Educational use only</p>
                </nav>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className="animate-page-in mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">{children}</main>
    </div>
  );
}
