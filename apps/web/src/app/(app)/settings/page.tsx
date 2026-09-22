'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, UserProfile } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';

interface WorkspaceData {
  id: string;
  name: string;
  monthlyQuota: number;
  usedQuota: number;
  timezone: string;
}

export default function SettingsPage() {
  const { getToken } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [getToken]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Workspace & Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your team, research schedule, and usage limits.</p>
      </div>

      {/* Quota & Usage Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-1">Monthly Search Quota</h2>
        <p className="text-xs text-slate-500 mb-4">
          Tracks SerpApi search units allocated per workspace per billing cycle.
        </p>

        {loading ? (
          <div className="text-xs text-slate-400">Loading quota details...</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">
                {workspace?.usedQuota || 0} / {workspace?.monthlyQuota || 500} search units used
              </span>
              <span className="text-xs text-indigo-600 font-semibold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                Active Workspace
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full"
                style={{
                  width: `${Math.min(100, (((workspace?.usedQuota || 0) / (workspace?.monthlyQuota || 500)) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4">Profile & Authentication</h2>
        <UserProfile routing="hash" />
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
