import React from 'react';

interface AuthLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export default function AuthLoadingScreen({
  message = 'Connecting to Secure Auth...',
  subMessage = 'Verifying credentials and preparing autonomous SERP scout engine...',
}: AuthLoadingScreenProps) {
  return (
    <div className="w-full bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-8 sm:p-10 shadow-2xl shadow-indigo-950/10 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
      {/* ── Brand Favicon / Logo Tile with Radar Sweep Glow ── */}
      <div className="relative mb-6">
        {/* Pulsing Ambient Radar Glow */}
        <div className="absolute -inset-3 rounded-2xl bg-indigo-500/20 blur-md animate-pulse" />
        <div
          className="absolute -inset-2 rounded-2xl border border-cyan-400/40 animate-ping opacity-60"
          style={{ animationDuration: '3s' }}
        />

        {/* Brand Favicon / Logo SVG Tile */}
        <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow-xl shadow-indigo-950/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-10 h-10">
            <defs>
              <linearGradient id="loader-logo-accent" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="#0f172a" />
            <circle
              cx="16"
              cy="16"
              r="10"
              stroke="#4f46e5"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              fill="none"
              opacity="0.6"
            />
            <circle
              cx="16"
              cy="16"
              r="6.5"
              stroke="#38bdf8"
              strokeWidth="1.5"
              fill="none"
              opacity="0.8"
            />
            <circle cx="16" cy="16" r="3" fill="url(#loader-logo-accent)" />
            <path
              d="M16 3 L16 8 M16 24 L16 29 M3 16 L8 16 M24 16 L29 16"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.9"
            />
          </svg>
        </div>
      </div>

      {/* ── Status Pill ── */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70 shadow-2xs mb-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span>Serp-Scout Radar Engine</span>
      </div>

      {/* ── Heading & Message ── */}
      <h3 className="text-base font-bold text-slate-900 mb-1.5">{message}</h3>
      <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-6">
        {subMessage}
      </p>

      {/* ── High-Tech Gradient Progress Bar ── */}
      <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 via-cyan-500 to-indigo-600 rounded-full animate-scan-line"
          style={{ width: '60%' }}
        />
      </div>
    </div>
  );
}
