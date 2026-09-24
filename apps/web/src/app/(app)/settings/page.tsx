'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, UserProfile } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';
import {
  Search,
  Globe,
  Loader2,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ProviderQuotaDetail {
  provider: 'serpapi' | 'tavily';
  name: string;
  monthlyLimit: number;
  used: number;
  remaining: number;
  percentage: number;
  description: string;
}

interface WorkspaceData {
  id: string;
  name: string;
  monthlyQuota: number;
  usedQuota: number;
  timezone: string;
  providerQuotas?: {
    serpapi: ProviderQuotaDetail;
    tavily: ProviderQuotaDetail;
  };
}

export default function SettingsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    async function loadWorkspace() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await apiClient<{ activeWorkspace: WorkspaceData | null }>('/api/workspaces/me', { token });
        setWorkspace(res.activeWorkspace);
      } catch (err) {
        console.error('Failed to load workspace:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkspace();
  }, [isLoaded, isSignedIn, getToken]);

  // Provider metrics with safe fallbacks
  const serpapiLimit = workspace?.providerQuotas?.serpapi?.monthlyLimit ?? (workspace?.monthlyQuota || 500);
  const serpapiUsed = workspace?.providerQuotas?.serpapi?.used ?? (workspace?.usedQuota || 0);
  const serpapiRemaining = workspace?.providerQuotas?.serpapi?.remaining ?? Math.max(0, serpapiLimit - serpapiUsed);
  const serpapiPercent = Math.min(100, Math.round((serpapiUsed / serpapiLimit) * 100));

  const tavilyLimit = workspace?.providerQuotas?.tavily?.monthlyLimit ?? ((workspace?.monthlyQuota || 500) * 2);
  const tavilyUsed = workspace?.providerQuotas?.tavily?.used ?? 0;
  const tavilyRemaining = workspace?.providerQuotas?.tavily?.remaining ?? Math.max(0, tavilyLimit - tavilyUsed);
  const tavilyPercent = Math.min(100, Math.round((tavilyUsed / tavilyLimit) * 100));

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Workspace & Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your team, research schedule, and usage limits.</p>
      </div>

      {/* Quota & Usage Card: SerpApi & Tavily Side-by-Side in the same box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Monthly Provider Quotas & Search Limits</h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Hybrid Search Architecture
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dedicated monthly quotas for high-fidelity Google searches and fast AI web sweeps.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-xs font-semibold text-slate-700 block">Workspace: {workspace?.name || 'Active Workspace'}</span>
            <span className="text-[11px] text-slate-400">Resets on 1st of each month</span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Loading provider quotas...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: SerpApi Google Engine */}
            <div className="border border-indigo-100 bg-indigo-50/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">SerpApi (Google Engine)</h3>
                    <p className="text-[11px] text-slate-500">Google Maps 3-Pack, Organic, & Reviews</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Active Provider
                </span>
              </div>

              {/* Progress and Numbers */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-extrabold text-slate-900 text-sm">
                    {serpapiUsed} <span className="text-slate-400 text-xs font-normal">/ {serpapiLimit} searches</span>
                  </span>
                  <span className="text-indigo-600 font-bold">
                    {serpapiRemaining} remaining ({serpapiPercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${serpapiPercent}%` }}
                  />
                </div>
              </div>

              {/* Capabilities checklist */}
              <div className="pt-2 border-t border-indigo-100/60 space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Google Maps 3-Pack Rank Audits (Indirapuram & local zones)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Google Organic Search & People Also Ask (PAA)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Live Place Reviews & Customer Feedback ingestion</span>
                </div>
              </div>
            </div>

            {/* Right Column: Tavily AI Search Engine */}
            <div className="border border-teal-100 bg-teal-50/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Tavily (AI Sweep Engine)</h3>
                    <p className="text-[11px] text-slate-500">Fast Web Sweeps, Messaging, & News</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  High-Speed Sweep
                </span>
              </div>

              {/* Progress and Numbers */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-extrabold text-slate-900 text-sm">
                    {tavilyUsed} <span className="text-slate-400 text-xs font-normal">/ {tavilyLimit} sweeps</span>
                  </span>
                  <span className="text-teal-600 font-bold">
                    {tavilyRemaining} remaining ({tavilyPercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${tavilyPercent}%` }}
                  />
                </div>
              </div>

              {/* Capabilities checklist */}
              <div className="pt-2 border-t border-teal-100/60 space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Token-conserving parallel web sweeps (0 SerpApi cost)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Competitor Messaging & value proposition extraction</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Real-time local industry news & press release discovery</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informational Footer inside the box */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Intelligent Hybrid Routing:</strong> Serp-Scout automatically leverages Tavily for broad web sweeps, conserving your SerpApi Google credits for high-value Maps 3-Pack and deep rank audits.
            </span>
          </div>
          <span className="text-[11px] text-slate-400 shrink-0">
            Fair Use Policy Active
          </span>
        </div>
      </div>

      {/* Automation & Schedule Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Automation, Schedule & Alerts</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure refresh frequency (daily, weekly, monthly), notification email recipients, and monitor BullMQ job diagnostics.
          </p>
        </div>
        <div>
          <Link
            href="/settings/schedule"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm inline-block whitespace-nowrap"
          >
            Manage Schedule →
          </Link>
        </div>
      </div>

      {/* Clerk User Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 pb-4 mb-4">
          <h2 className="text-base font-bold text-slate-900">Profile & Authentication</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal account credentials, verified emails, and active security sessions.
          </p>
        </div>

        <div className="w-full flex justify-center overflow-hidden">
          <div className="w-full max-w-full overflow-x-auto flex justify-center py-1">
            <UserProfile
              routing="hash"
              appearance={{
                elements: {
                  rootBox: 'w-full max-w-full flex justify-center',
                  cardBox: 'w-full max-w-full shadow-none border-0 rounded-xl',
                  card: 'w-full max-w-full shadow-none border border-slate-100 rounded-xl',
                  scrollBox: 'w-full max-w-full',
                  pageScrollBox: 'p-4 sm:p-6 max-w-full',
                  navbar: 'border-r border-slate-200/80',
                  navbarButton: 'text-xs font-semibold text-slate-600 hover:text-slate-900',
                  headerTitle: 'text-base font-bold text-slate-900',
                  headerSubtitle: 'text-xs text-slate-500',
                },
                variables: {
                  colorPrimary: '#4f46e5',
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Danger Zone: Workspace & Data Deletion */}
      <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-rose-900 mb-1">Danger Zone</h2>
        <p className="text-xs text-rose-600 mb-4">
          Permanently delete this workspace, including all associated business profiles, competitors, keywords, search runs, and reports.
        </p>
        <button
          onClick={async () => {
            if (!workspace) return;
            const confirmName = window.prompt(
              `To delete this workspace, type "${workspace.name}" below:`
            );
            if (confirmName !== workspace.name) {
              if (confirmName !== null) alert('Workspace name did not match. Deletion cancelled.');
              return;
            }

            try {
              const token = await getToken();
              if (!token) return;
              await apiClient(`/api/workspaces/${workspace.id}`, {
                token,
                method: 'DELETE',
              });
              alert('Workspace and all associated intelligence data deleted.');
              window.location.href = '/onboarding';
            } catch (err: any) {
              alert(err.message || 'Failed to delete workspace');
            }
          }}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm"
        >
          Delete Workspace & All Data
        </button>
      </div>

      <div>
        <Link href="/app" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to Overview
        </Link>
      </div>
    </div>
  );
}
