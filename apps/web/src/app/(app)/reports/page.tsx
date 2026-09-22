'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';
import { GeneratedReport } from '@serp-scout/types';

interface BusinessSummary {
  id: string;
  name: string;
  websiteUrl: string;
  city?: string;
}

interface ReportRecord {
  id: string;
  businessId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  generatedAt: string;
  summary: GeneratedReport;
}

interface RecommendationRecord {
  id: string;
  reportId: string;
  title: string;
  description: string;
  evidence: {
    summary: string;
    queries?: string[];
    urls?: string[];
  };
  impact: string;
  effort: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  confidence: string;
  status: 'planned' | 'in_progress' | 'completed' | 'dismissed';
}

interface FullReportDetails {
  report: ReportRecord;
  business: BusinessSummary;
  recommendations: RecommendationRecord[];
  evidence: Array<{
    id: string;
    sourceUrl: string;
    sourceTitle: string;
    claim: string;
  }>;
}

export default function ReportsPage() {
  const { getToken } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string>('');

  const [reportsList, setReportsList] = useState<ReportRecord[]>([]);
  const [activeReportDetails, setActiveReportDetails] = useState<FullReportDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load businesses
  useEffect(() => {
    async function loadBusinesses() {
      try {
        const token = await getToken();
        if (!token) return;
        const list = await apiClient<BusinessSummary[]>('/api/businesses', { token });
        setBusinesses(list);
        if (list.length > 0) {
          setSelectedBizId(list[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load businesses:', err);
      }
    }
    loadBusinesses();
  }, [getToken]);

  // Load report history
  const loadReports = useCallback(async () => {
    if (!selectedBizId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const list = await apiClient<ReportRecord[]>(`/api/businesses/${selectedBizId}/reports`, { token });
      setReportsList(list);
      if (list.length > 0) {
        loadReportDetails(list[0].id);
      } else {
        setActiveReportDetails(null);
      }
    } catch (err: any) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBizId, getToken]);

  useEffect(() => {
    loadReports();
  }, [selectedBizId, loadReports]);

  // Load single report details
  const loadReportDetails = async (reportId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const details = await apiClient<FullReportDetails>(`/api/reports/${reportId}`, { token });
      setActiveReportDetails(details);
    } catch (err: any) {
      console.error('Failed to load report details:', err);
    }
  };

  // Generate fresh report
  const handleGenerateReport = async () => {
    if (!selectedBizId) return;
    setGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = await getToken();
      if (!token) return;
      await apiClient(`/api/businesses/${selectedBizId}/reports/generate`, {
        method: 'POST',
        token,
      });
      setSuccessMsg('Fresh Weekly Intelligence Report and Prioritized Action Plan generated!');
      await loadReports();
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // Update recommendation status
  const handleUpdateRecStatus = async (recId: string, status: 'planned' | 'in_progress' | 'completed' | 'dismissed') => {
    try {
      const token = await getToken();
      if (!token) return;
      await apiClient(`/api/recommendations/${recId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      });
      if (activeReportDetails) {
        setActiveReportDetails({
          ...activeReportDetails,
          recommendations: activeReportDetails.recommendations.map((r) =>
            r.id === recId ? { ...r, status } : r
          ),
        });
      }
    } catch (err: any) {
      console.error('Failed to update recommendation status:', err);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!activeReportDetails) return;
    setDownloadingPdf(true);
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:3001/api/reports/${activeReportDetails.report.id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('PDF download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `serp-scout-report-${activeReportDetails.report.periodEnd.split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      console.error('PDF error:', err);
      setError('Could not download PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Download CSV
  const handleDownloadCsv = async () => {
    if (!activeReportDetails) return;
    setDownloadingCsv(true);
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:3001/api/reports/${activeReportDetails.report.id}/csv`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('CSV download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `serp-scout-actions-${activeReportDetails.report.periodEnd.split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      console.error('CSV error:', err);
      setError('Could not export CSV. Please try again.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'P1':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'P2':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Reports & Action Plans</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Prioritized 3 to 5 high-impact actions with full evidence verification. PDF and CSV export ready.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {businesses.length > 1 && (
            <select
              value={selectedBizId}
              onChange={(e) => setSelectedBizId(e.target.value)}
              className="text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleGenerateReport}
            disabled={generating || !selectedBizId}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:opacity-95 shadow-sm transition-all disabled:opacity-50"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Synthesizing Report...
              </>
            ) : (
              <>
                <span>✨</span> Generate Weekly Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 font-bold ml-2">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Main Grid: Left sidebar (Report History) + Right content (Full Report) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: History */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Report Archive</h2>
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading reports...</div>
          ) : reportsList.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500 shadow-sm">
              <p>No reports generated yet.</p>
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[11px] font-semibold hover:bg-indigo-700 shadow-sm"
              >
                Generate First Report
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {reportsList.map((rep) => {
                const isActive = activeReportDetails?.report.id === rep.id;
                const dateStr = `${new Date(rep.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(rep.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

                return (
                  <button
                    key={rep.id}
                    onClick={() => loadReportDetails(rep.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-indigo-50/70 border-indigo-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{dateStr}</span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold uppercase">
                        {rep.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {rep.summary?.executiveSummary?.weeklyFocus || 'Weekly Action Plan'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Active Report View */}
        <div className="lg:col-span-3">
          {activeReportDetails ? (
            <div className="space-y-6">
              {/* Report Header Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-bold uppercase">
                      Weekly Intelligence
                    </span>
                    <span className="text-xs text-slate-400">
                      Period: {activeReportDetails.report.periodStart.split('T')[0]} to{' '}
                      {activeReportDetails.report.periodEnd.split('T')[0]}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    {activeReportDetails.business.name} • Outcomes Report
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                  >
                    <span>📄</span> {downloadingPdf ? 'Rendering PDF...' : 'Download PDF'}
                  </button>
                  <button
                    onClick={handleDownloadCsv}
                    disabled={downloadingCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                  >
                    <span>📊</span> {downloadingCsv ? 'Exporting...' : 'Export CSV'}
                  </button>
                </div>
              </div>

              {/* Executive Summary 4-Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-blue-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                    Important Market Changes
                  </span>
                  <p className="text-xs text-slate-800 mt-1 font-medium">
                    {activeReportDetails.report.summary?.executiveSummary?.importantChanges}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-emerald-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                    Main Business Opportunity
                  </span>
                  <p className="text-xs text-slate-800 mt-1 font-medium">
                    {activeReportDetails.report.summary?.executiveSummary?.mainOpportunity}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-rose-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                    Competitive Threat
                  </span>
                  <p className="text-xs text-slate-800 mt-1 font-medium">
                    {activeReportDetails.report.summary?.executiveSummary?.mainCompetitiveThreat}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-purple-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">
                    Weekly Strategic Focus
                  </span>
                  <p className="text-xs text-slate-800 mt-1 font-medium">
                    {activeReportDetails.report.summary?.executiveSummary?.weeklyFocus}
                  </p>
                </div>
              </div>

              {/* Action Plan (Top 3 to 5 Prioritized Actions) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Priority Action Plan (3 to 5 Actions)</h3>
                    <p className="text-xs text-slate-500">
                      Ranked by return on effort: P0 (immediate wins) to P3 (strategic investments).
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {activeReportDetails.recommendations.length} Actions
                  </span>
                </div>

                <div className="space-y-3">
                  {activeReportDetails.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${getPriorityBadge(
                              rec.priority
                            )}`}
                          >
                            {rec.priority} Priority
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{rec.title}</h4>
                        </div>

                        <select
                          value={rec.status}
                          onChange={(e) => handleUpdateRecStatus(rec.id, e.target.value as any)}
                          className={`text-[11px] font-semibold border rounded-lg px-2 py-1 ${
                            rec.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : rec.status === 'in_progress'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="planned">Planned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>

                      <p className="text-xs text-slate-700">
                        <strong>Problem / Target:</strong> {rec.description}
                      </p>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Verified Evidence:
                        </span>
                        <p className="text-slate-700 italic text-[11px] mt-0.5">
                          "{rec.evidence?.summary}"
                        </p>
                        {rec.evidence?.queries && rec.evidence.queries.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-semibold">Observed On:</span>
                            {rec.evidence.queries.map((q, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded"
                              >
                                "{q}"
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span>Impact: <strong className="text-slate-700 uppercase">{rec.impact}</strong></span>
                        <span>Effort: <strong className="text-slate-700 uppercase">{rec.effort}</strong></span>
                        <span>Confidence: <strong className="text-slate-700 uppercase">{rec.confidence}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collapsible Evidence Appendix */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Evidence Appendix & Citation Trail
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {activeReportDetails.report.summary?.evidenceAppendix?.length || 0} citations
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-[10px]">
                        <th className="py-2 px-3">Search Query</th>
                        <th className="py-2 px-3">Source Provider</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Cited URL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {activeReportDetails.report.summary?.evidenceAppendix?.slice(0, 10).map((ev, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{ev.query}</td>
                          <td className="py-2.5 px-3 text-slate-500">{ev.source}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">{ev.date}</td>
                          <td className="py-2.5 px-3 text-indigo-600 truncate max-w-[200px]">
                            {ev.url ? (
                              <a href={ev.url} target="_blank" rel="noreferrer" className="hover:underline">
                                {ev.url}
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-400 shadow-sm">
              Select a report from the archive or click "Generate Weekly Report" above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
