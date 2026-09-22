'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';

interface CompetitorRecord {
  id: string;
  businessId: string;
  name: string;
  domain: string;
  websiteUrl: string;
  mapsUrl?: string;
  category?: string;
  competitorType: string;
  confidenceScore: number;
  status: 'candidate' | 'confirmed' | 'rejected' | 'indirect';
  userNotes?: string;
  createdAt: string;
}

interface BusinessSummary {
  id: string;
  name: string;
  city?: string;
}

export default function CompetitorsPage() {
  const { getToken } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string>('');
  const [competitors, setCompetitors] = useState<CompetitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'candidate' | 'confirmed' | 'indirect' | 'rejected'>('all');
  const [error, setError] = useState<string | null>(null);

  // Manual Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualType, setManualType] = useState('direct');
  const [manualNotes, setManualNotes] = useState('');
  const [adding, setAdding] = useState(false);

  // Load businesses
  useEffect(() => {
    async function init() {
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
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [getToken]);

  // Load competitors for active business
  const loadCompetitors = useCallback(async () => {
    if (!selectedBizId) return;
    try {
      const token = await getToken();
      if (!token) return;
      const list = await apiClient<CompetitorRecord[]>(`/api/businesses/${selectedBizId}/competitors`, { token });
      setCompetitors(list);
    } catch (err: any) {
      console.error('Failed to load competitors:', err);
    }
  }, [selectedBizId, getToken]);

  useEffect(() => {
    loadCompetitors();
  }, [selectedBizId, loadCompetitors]);

  const handleDiscover = async () => {
    if (!selectedBizId) return;
    setDiscovering(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication expired.');

      await apiClient(`/api/businesses/${selectedBizId}/competitors/discover`, {
        token,
        method: 'POST',
      });
      await loadCompetitors();
    } catch (err: any) {
      console.error('Discovery failed:', err);
      setError(err.message || 'Competitor discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleUpdateStatus = async (competitorId: string, status: 'confirmed' | 'rejected' | 'indirect') => {
    try {
      const token = await getToken();
      if (!token) return;

      await apiClient(`/api/competitors/competitor/${competitorId}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setCompetitors((prev) =>
        prev.map((c) => (c.id === competitorId ? { ...c, status } : c))
      );
    } catch (err: any) {
      console.error('Failed to update competitor status:', err);
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (competitorId: string) => {
    if (!confirm('Are you sure you want to remove this competitor?')) return;
    try {
      const token = await getToken();
      if (!token) return;

      await apiClient(`/api/competitors/competitor/${competitorId}`, {
        token,
        method: 'DELETE',
      });
      setCompetitors((prev) => prev.filter((c) => c.id !== competitorId));
    } catch (err: any) {
      console.error('Failed to delete competitor:', err);
      setError(err.message || 'Failed to remove competitor');
    }
  };

  const handleAddManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBizId || !manualName.trim() || !manualUrl.trim()) return;

    setAdding(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication expired.');

      await apiClient('/api/competitors/competitor', {
        token,
        method: 'POST',
        body: JSON.stringify({
          businessId: selectedBizId,
          name: manualName.trim(),
          websiteUrl: manualUrl.startsWith('http') ? manualUrl.trim() : `https://${manualUrl.trim()}`,
          category: manualCategory.trim() || undefined,
          competitorType: manualType,
          userNotes: manualNotes.trim() || undefined,
        }),
      });

      setShowAddModal(false);
      setManualName('');
      setManualUrl('');
      setManualCategory('');
      setManualNotes('');
      await loadCompetitors();
    } catch (err: any) {
      console.error('Manual competitor add failed:', err);
      setError(err.message || 'Failed to add competitor');
    } finally {
      setAdding(false);
    }
  };

  const filteredCompetitors = competitors.filter((c) => {
    if (activeTab === 'all') return true;
    return c.status === activeTab;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Competitor Discovery & Radar</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Discover who competes for your local search customers and evaluate their organic and local overlap.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            + Add Competitor Manually
          </button>
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:opacity-95 shadow-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            {discovering ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Discovering Competitors...
              </>
            ) : (
              '⚡ Discover Competitors'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium animate-fade-in shadow-xs">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {(['all', 'candidate', 'confirmed', 'indirect', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition ${
              activeTab === tab
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab} (
            {tab === 'all'
              ? competitors.length
              : competitors.filter((c) => c.status === tab).length}
            )
          </button>
        ))}
      </div>

      {/* Competitors List */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Loading competitor records...</div>
      ) : filteredCompetitors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-base font-bold text-slate-800">No competitors in this view</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click &ldquo;Discover Competitors&rdquo; to analyze your search results and find businesses ranking in your service area.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCompetitors.map((comp) => {
            const score = Math.round(comp.confidenceScore);
            return (
              <div
                key={comp.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{comp.name}</h3>
                      <a
                        href={comp.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span>{comp.domain}</span>
                        <span>↗</span>
                      </a>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          score >= 80
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : score >= 60
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {score}% Match
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        {comp.competitorType}
                      </span>
                    </div>
                  </div>

                  {comp.category && (
                    <div className="mt-3">
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {comp.category}
                      </span>
                    </div>
                  )}

                  {comp.userNotes && (
                    <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-100 text-xs text-amber-900">
                      <strong>Notes:</strong> {comp.userNotes}
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    {comp.status !== 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(comp.id, 'confirmed')}
                        className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold transition"
                      >
                        Confirm ✓
                      </button>
                    )}
                    {comp.status !== 'indirect' && (
                      <button
                        onClick={() => handleUpdateStatus(comp.id, 'indirect')}
                        className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition"
                      >
                        Mark Indirect
                      </button>
                    )}
                    {comp.status !== 'rejected' && (
                      <button
                        onClick={() => handleUpdateStatus(comp.id, 'rejected')}
                        className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium transition"
                      >
                        Reject ✕
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(comp.id)}
                    className="text-slate-400 hover:text-rose-600 font-medium transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Add Competitor Manually</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Track a specific competitor regardless of search ranking discovery.
            </p>

            <form onSubmit={handleAddManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Competitor Name *
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Downtown Dental Care"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Website URL *
                </label>
                <input
                  type="text"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="e.g. https://downtowndental.example.com"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    placeholder="e.g. Cosmetic Dentistry"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Competitor Type
                  </label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="direct">Direct</option>
                    <option value="geographic">Geographic</option>
                    <option value="search">Search</option>
                    <option value="indirect">Indirect</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notes
                </label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Main downtown competitor, offers Invisalign discounts"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
                  disabled={adding}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Competitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
