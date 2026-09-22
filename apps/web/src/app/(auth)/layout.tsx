import React from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 overflow-hidden">
      {/* ── BACKGROUND MOTION VISUALS ── */}
      {/* 1. Subtle SVG Dot Grid Matrix */}
      <div className="absolute inset-0 -z-30 opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,#000_60%,transparent_100%)]">
        <svg className="w-full h-full" width="100%" height="100%">
          <defs>
            <pattern id="auth-grid-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#6366f1" opacity="0.35" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid-dots)" />
        </svg>
      </div>

      {/* 2. Dynamic Floating Radial Gradient Orbs */}
      <div className="absolute top-10 left-1/4 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-500/25 via-cyan-400/20 to-transparent rounded-full blur-3xl pointer-events-none -z-20 animate-orb-1" />
      <div className="absolute bottom-10 right-1/4 translate-x-1/2 w-[460px] h-[460px] bg-gradient-to-bl from-cyan-500/20 via-emerald-400/15 to-indigo-500/15 rounded-full blur-3xl pointer-events-none -z-20 animate-orb-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-20 animate-pulse" />

      {/* 3. Rotating High-Tech Radar Scanner Visual */}
      <div className="hidden lg:block absolute top-12 right-12 xl:right-24 w-72 h-72 -z-10 pointer-events-none opacity-40">
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-indigo-400/25 border-dashed animate-spin" style={{ animationDuration: '60s' }} />
          <div className="absolute inset-8 rounded-full border border-cyan-400/30" />
          <div className="absolute inset-16 rounded-full border border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/25 via-transparent to-transparent animate-radar" />
          <div className="absolute w-full h-[1px] bg-indigo-400/20" />
          <div className="absolute h-full w-[1px] bg-indigo-400/20" />
          <div className="absolute top-10 left-14 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="absolute top-10 left-14 w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <div className="absolute bottom-14 right-16 w-2 h-2 rounded-full bg-cyan-400 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute bottom-14 right-16 w-2 h-2 rounded-full bg-cyan-500" />
        </div>
      </div>

      {/* Brand Header with Favicon SVG & Slogan */}
      <div className="mb-6 text-center relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow-lg shadow-indigo-950/20 group-hover:scale-105 group-hover:border-indigo-500 transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6">
              <defs>
                <linearGradient id="auth-header-accent" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="8" fill="#0f172a" />
              <circle cx="16" cy="16" r="10" stroke="#4f46e5" strokeWidth="1.5" strokeDasharray="4 2" fill="none" opacity="0.6" />
              <circle cx="16" cy="16" r="6.5" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.8" />
              <circle cx="16" cy="16" r="3" fill="url(#auth-header-accent)" />
              <path d="M16 3 L16 8 M16 24 L16 29 M3 16 L8 16 M24 16 L29 16" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
            </svg>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Serp<span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">Scout</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Autonomous SEO Radar
            </span>
          </div>
        </Link>
        <p className="text-xs text-slate-500 font-medium italic mt-2">
          &ldquo;Success is measured by real business outcomes rather than a &apos;visibility score.&apos;&rdquo;
        </p>
      </div>
      <div className="w-full max-w-md flex justify-center relative z-10">{children}</div>
    </div>
  );
}
