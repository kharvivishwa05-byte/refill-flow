import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "RefillFlow - B2B AI Prescription Intelligence & Operations",
  description: "B2B AI Prescription Intelligence Assistant & Refill Control Tower",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-900 antialiased">
        <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
            {/* Logo */}
            <Link
              href="/"
              className="group flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-500/20 transition duration-300 group-hover:scale-105">
                <span className="text-lg font-black text-white">
                  R
                </span>
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Refill<span className="text-cyan-400">Flow</span>
                </h1>

                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  Operations Control Tower
                </p>
              </div>
            </Link>

            {/* Navigation */}
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/prescription-assistant"
                className="relative flex items-center gap-2 rounded-lg bg-cyan-500/10 border border-cyan-400/30 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 hover:text-cyan-200 shadow-sm"
              >
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                AI Prescription Assistant
              </Link>

              <Link
                href="/provider"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Provider Review
              </Link>

              <Link
                href="/audit"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Audit
              </Link>
            </div>

            {/* System status */}
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>

              <span className="text-xs font-semibold text-emerald-300">
                System Online
              </span>
            </div>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}