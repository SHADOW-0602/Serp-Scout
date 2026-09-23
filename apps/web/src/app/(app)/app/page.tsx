'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';
import { WebsiteAnalysis } from '@serp-scout/types';
import {
  ArrowRight,
  Sparkles,
  MapPin,
  TrendingUp,
  Activity,
  ShieldCheck,
  Target,
  Zap,
  Compass,
  CheckCircle2,
  Search,
  Users,
  BarChart3,
  Layers,
  FileText,
  RefreshCw,
  AlertTriangle,
  Key,
} from 'lucide-react';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';

interface BusinessSummary {
  id: string;
  name: string;
  websiteUrl: string;
  industry?: string;
  city?: string;
  country?: string;
  primaryGoal?: string;
  dataStale: boolean;
  lastAnalyzedAt?: string;
  createdAt: string;
}

interface JobStatusResponse {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed';
  isCompleted: boolean;
  isFailed: boolean;
  failedReason?: string;
  result?: WebsiteAnalysis;
}

export default function OverviewDashboardPage() {
  const { getToken } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analysis status states
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<WebsiteAnalysis | null>(null);

  const loadBusinesses = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const list = await apiClient<BusinessSummary[]>('/api/businesses', { token });
      setBusinesses(list);
    } catch (err: any) {
      console.error('Failed to load businesses:', err);
      setError(err.message || 'Failed to load business profiles');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const autoTriggeredRef = React.useRef(false);

  const trackJob = useCallback(
    async (jobId: string) => {
      setAnalyzing(true);
      setAnalysisStatus('Autonomous analysis queued. Initializing background worker...');
      setError(null);

      try {
        const token = await getToken();
        if (!token) throw new Error('Authentication expired.');

        const pollInterval = setInterval(async () => {
          try {
            const jobRes = await apiClient<JobStatusResponse>(`/api/jobs/${jobId}`, { token });

            if (jobRes.state === 'active') {
              setAnalysisStatus('Crawling website, extracting meta tags & running Groq AI analysis...');
            } else if (jobRes.isCompleted) {
              clearInterval(pollInterval);
              setAnalyzing(false);
              setAnalysisStatus(null);
              if (jobRes.result) {
                setAnalysisResult(jobRes.result);
              }
              loadBusinesses();
            } else if (jobRes.isFailed) {
              clearInterval(pollInterval);
              setAnalyzing(false);
              setAnalysisStatus(null);
              setError(`Analysis failed: ${jobRes.failedReason || 'Worker encountered an issue'}`);
            }
          } catch (pollErr: any) {
            clearInterval(pollInterval);
            setAnalyzing(false);
            setAnalysisStatus(null);
            setError(pollErr.message || 'Error checking background analysis status');
          }
        }, 2000);
      } catch (err: any) {
        setAnalyzing(false);
        setAnalysisStatus(null);
        setError(err.message || 'Failed to inspect analysis job');
      }
    },
    [getToken, loadBusinesses]
  );

  const handleRunAnalysis = useCallback(
    async (businessId: string) => {
      setAnalyzing(true);
      setAnalysisStatus('Triggering website intelligence engine in background...');
      setError(null);

      try {
        const token = await getToken();
        if (!token) throw new Error('Authentication expired.');

        const enqueueRes = await apiClient<{ jobId: string }>(`/api/businesses/${businessId}/analyze`, {
          token,
          method: 'POST',
        });

        trackJob(enqueueRes.jobId);
      } catch (err: any) {
        setAnalyzing(false);
        setAnalysisStatus(null);
        setError(err.message || 'Failed to initiate website analysis');
      }
    },
    [getToken, trackJob]
  );

  // Automatically trigger background analysis if coming from onboarding or unanalyzed business
  useEffect(() => {
    if (loading || businesses.length === 0 || autoTriggeredRef.current) return;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const autoAnalyze = params.get('auto_analyze') === 'true';
      const paramJobId = params.get('job_id');
      const paramBizId = params.get('biz_id') || params.get('business_id');

      if (paramJobId) {
        autoTriggeredRef.current = true;
        trackJob(paramJobId);
        return;
      }

      const targetBiz = paramBizId
        ? businesses.find((b) => b.id === paramBizId) || businesses[0]
        : businesses[0];

      if (targetBiz && (autoAnalyze || !targetBiz.lastAnalyzedAt)) {
        autoTriggeredRef.current = true;
        handleRunAnalysis(targetBiz.id);
      }
    }
  }, [loading, businesses, trackJob, handleRunAnalysis]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-full max-w-md">
          <AuthLoadingScreen
            message="Loading Competitive Overview..."
            subMessage="Retrieving your monitored local businesses, SERP rankings, and competitor radar..."
          />
        </div>
      </div>
    );
  }

  // If no businesses exist in workspace, prompt to onboard with rich full-page responsive layout
  if (businesses.length === 0) {
    return (
      <div className="relative -my-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 overflow-hidden min-h-[calc(100vh-4.5rem)] flex flex-col justify-between">
        {/* ── BACKGROUND MOTION VISUALS ── */}
        {/* 1. Subtle SVG Dot Grid Matrix */}
        <div className="absolute inset-0 -z-30 opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,#000_60%,transparent_100%)]">
          <svg className="w-full h-full" width="100%" height="100%">
            <defs>
              <pattern id="welcome-grid-dots" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.3" fill="#6366f1" opacity="0.35" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#welcome-grid-dots)" />
          </svg>
        </div>

        {/* 2. Floating Radial Mesh Orbs */}
        <div className="absolute top-4 left-1/4 -translate-x-1/2 w-[480px] h-[480px] bg-gradient-to-tr from-indigo-500/20 via-cyan-400/20 to-transparent rounded-full blur-3xl pointer-events-none -z-20 animate-orb-1" />
        <div className="absolute bottom-4 right-1/4 translate-x-1/2 w-[520px] h-[520px] bg-gradient-to-bl from-cyan-500/20 via-emerald-400/15 to-indigo-500/15 rounded-full blur-3xl pointer-events-none -z-20 animate-orb-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-20 animate-pulse" />

        {/* 3. Rotating High-Tech SERP Radar Scanner Visual in Background */}
        <div className="hidden lg:block absolute top-6 right-8 xl:right-28 w-72 md:w-96 h-72 md:h-96 -z-10 pointer-events-none opacity-40">
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-indigo-400/25 border-dashed animate-spin" style={{ animationDuration: '60s' }} />
            <div className="absolute inset-10 rounded-full border border-cyan-400/30" />
            <div className="absolute inset-20 rounded-full border border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/25 via-transparent to-transparent animate-radar" />
            <div className="absolute w-full h-[1px] bg-indigo-400/20" />
            <div className="absolute h-full w-[1px] bg-indigo-400/20" />
            <div className="absolute top-12 left-16 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div className="absolute top-12 left-16 w-3 h-3 rounded-full bg-emerald-500" />
            <div className="absolute bottom-16 right-20 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" style={{ animationDuration: '2.2s' }} />
            <div className="absolute bottom-16 right-20 w-2.5 h-2.5 rounded-full bg-cyan-500" />
          </div>
        </div>

        {/* ── TOP HERO CARD ── */}
        <div className="max-w-3xl mx-auto w-full text-center relative z-10 my-auto pt-2 pb-6">
          {/* Favicon Logo Tile */}
          <div className="relative inline-block mb-5">
            <div className="absolute -inset-3 rounded-2xl bg-indigo-500/20 blur-md animate-pulse" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow-2xl shadow-indigo-950/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-10 h-10 sm:w-12 sm:h-12">
                <defs>
                  <linearGradient id="welcome-logo-accent" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="8" fill="#0f172a" />
                <circle cx="16" cy="16" r="10" stroke="#4f46e5" strokeWidth="1.5" strokeDasharray="4 2" fill="none" opacity="0.6" />
                <circle cx="16" cy="16" r="6.5" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.8" />
                <circle cx="16" cy="16" r="3" fill="url(#welcome-logo-accent)" />
                <path d="M16 3 L16 8 M16 24 L16 29 M3 16 L8 16 M24 16 L29 16" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
              </svg>
            </div>
          </div>

          {/* Radar Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live SERP Radar Engine &bull; Ready to Initialize</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.15] mb-4">
            Welcome to <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 bg-clip-text text-transparent">Serp-Scout</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mb-3 font-medium italic">
            &ldquo;Success is measured by real business outcomes rather than an arbitrary visibility score.&rdquo;
          </p>

          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            You haven&apos;t set up a business yet. Complete our quick 2-minute onboarding to automatically pinpoint who takes appointments from you, track striking-distance keywords, and generate weekly verified action plans.
          </p>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-cyan-200" />
              <span>Start 2-Minute Business Onboarding</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Zero-Trust SSRF Protected
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-600" />
              100% Evidence Grounded
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Sub-15s AI Local SERP Scan
            </span>
          </div>
        </div>

        {/* ── EXPANSIVE VISUAL FEATURE RADAR GRID (Fills Entire Page on PC / Tablet / Mobile) ── */}
        <div className="max-w-6xl mx-auto w-full relative z-10 pt-4">
          <div className="text-center mb-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/80">
              Autonomous Capabilities Ready Upon Setup
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1: Google Map 3-Pack */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-lg shadow-indigo-950/5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3 text-emerald-600 group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold text-slate-900 text-sm">Google Map 3-Pack</h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Rank #1
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Real-time monitoring of local pack positions to win high-intent nearby phone call inquiries.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-600 font-bold">
                <span>+42% Phone Calls</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 2: Local Rival Discovery */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-lg shadow-indigo-950/5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-3 text-indigo-600 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold text-slate-900 text-sm">Rival Intelligence</h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    +5 Pos
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Autonomous detection of competitor strategy gaps and displaced search appointments.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-600 font-bold">
                <span>Direct Rival Displaced</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 3: Striking-Distance Keywords */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-lg shadow-indigo-950/5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center mb-3 text-cyan-600 group-hover:scale-105 transition-transform">
                  <Search className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold text-slate-900 text-sm">Striking Keywords</h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                    Pos 4–10
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fastest route to new revenue by pushing low-hanging rankings onto Google Page 1.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-cyan-600 font-bold">
                <span>High Intent Keywords</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 4: Weekly Action Plans */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-lg shadow-indigo-950/5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3 text-amber-600 group-hover:scale-105 transition-transform">
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold text-slate-900 text-sm">Verified Action Plans</h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Weekly
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Zero guesswork. Receive 3 to 5 prioritized, evidence-backed steps to outrank rivals.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-600 font-bold">
                <span>Zero Vanity Metrics</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const primaryBusiness = businesses[0];

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{primaryBusiness.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {primaryBusiness.industry || 'Local Business'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span>{primaryBusiness.city || 'Target Area'}</span>
            <span>•</span>
            <a
              href={primaryBusiness.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline"
            >
              {primaryBusiness.websiteUrl}
            </a>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/onboarding"
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            + Add Another Business
          </Link>
          <button
            disabled={analyzing}
            onClick={() => handleRunAnalysis(primaryBusiness.id)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:opacity-95 shadow-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Analyzing Website...
              </>
            ) : primaryBusiness.lastAnalyzedAt ? (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Analyze Website (AI)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>Analyze Website (AI)</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Progress Status Banner */}
      {analyzing && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-700/60 text-white shadow-xl shadow-indigo-950/20 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/80 border border-indigo-500/50 flex items-center justify-center shrink-0 shadow-inner">
              <span className="h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                  Autonomous Background Scout Active
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <p className="text-sm font-semibold text-slate-100 mt-0.5">
                {analysisStatus || 'Crawling website & extracting competitor landscape...'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Zero manual intervention required. Results and actionable recommendations will populate dynamically below upon completion.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700 animate-fade-in shadow-xs">
          {error}
        </div>
      )}

      {/* Stale Data Indicator Banner */}
      {primaryBusiness.dataStale && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-semibold">Search Intelligence Data is Stale</strong>
              <p className="text-xs text-amber-800 mt-0.5">
                Last research cycle was over configured threshold ago. Competitor movements and rank fluctuations may have occurred since then.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/schedule"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shadow-xs whitespace-nowrap"
            >
              Configure Schedule / Refresh →
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards with Landing Page Style Elevation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Primary Outcome Goals
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(primaryBusiness.primaryGoal || 'More qualified phone calls & inquiries')
              .split(/;\s*|,\s*/)
              .filter(Boolean)
              .map((goal, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70"
                >
                  {goal}
                </span>
              ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Engine aligns weekly tasks to these priorities</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Website Analysis Status
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-2">
            {analyzing ? 'Scanning...' : primaryBusiness.lastAnalyzedAt ? 'Audited' : 'Pending'}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {analyzing
              ? 'Autonomous agent active in background'
              : primaryBusiness.lastAnalyzedAt
              ? `Last analyzed: ${new Date(primaryBusiness.lastAnalyzedAt).toLocaleDateString()}`
              : 'Auto-analysis running in background'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Search Visibility Status
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">Active</div>
          <p className="text-xs text-slate-500 mt-2">
            <Link href="/keywords" className="text-indigo-600 font-semibold hover:underline">
              Tracked Keywords →
            </Link>
          </p>
        </div>
      </div>

      {/* Live AI Website Analysis Results (if triggered or available) */}
      {analysisResult && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-all duration-200 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                AI Website Extraction Report
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                Extracted Business Intelligence
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Completed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Detected Category & Services */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">
                  Detected Category
                </span>
                <p className="text-base font-semibold text-slate-800 mt-1">
                  {analysisResult.detectedCategory}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">
                  Extracted Services ({analysisResult.detectedServices.length})
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {analysisResult.detectedServices.map((svc) => (
                    <span
                      key={svc}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      {svc}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">
                  Detected Target Locations
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {analysisResult.detectedLocations.map((loc) => (
                    <span
                      key={loc}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                      <span>{loc}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Candidate Keywords & Missing Pages */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">
                  Discovered Candidate Keywords ({analysisResult.candidateKeywords.length})
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {analysisResult.candidateKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1"
                    >
                      <Key className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span>{kw}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">
                  Missing High-Intent Pages (Opportunities)
                </span>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {analysisResult.missingOpportunities.servicePages.map((page) => (
                    <li key={page} className="flex items-center gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>Missing Service Page: {page}</span>
                    </li>
                  ))}
                  {analysisResult.missingOpportunities.locationPages.map((page) => (
                    <li key={page} className="flex items-center gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>Missing Location Page: {page}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Prioritized Actions Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="max-w-2xl">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white tracking-wide uppercase">
            Weekly Focus
          </span>
          <h2 className="text-xl font-bold mt-3">3 Practical SEO Actions This Week</h2>
          <p className="text-sm text-indigo-200 mt-1">
            Serp-Scout turns search results into direct business outcomes. Run research to generate your first weekly batch.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <Link
              href="/reports"
              className="px-5 py-2.5 rounded-lg bg-white text-indigo-950 font-semibold text-xs hover:bg-indigo-50 transition shadow-sm"
            >
              Explore Weekly Reports →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
