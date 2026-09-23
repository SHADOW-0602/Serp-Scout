'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';
import {
  Sparkles,
  Megaphone,
  Star,
  X,
  Newspaper,
  TrendingUp,
  FileText,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface BusinessSummary {
  id: string;
  name: string;
  city?: string;
}

interface ContentGapItem {
  id: string;
  topic: string;
  recommendedPageType: string;
  suggestedTitle: string;
  suggestedHeadings: string[];
  suggestedFaqs: string[];
  targetIntent: string;
  priority: string;
  effort: string;
  impact: string;
  status: string;
  evidence?: {
    competitorDomain?: string;
    competitorUrl?: string;
  };
}

interface MessagingData {
  competitors: Array<{
    competitorName: string;
    domain: string;
    headline: string;
    primaryOffer: string;
    differentiator: string;
    priceLanguage: string | null;
    cta: string;
    trustSignals: string[];
  }>;
  marketPatterns: Array<{
    pattern: string;
    observedFacts: string[];
    aiInterpretation: string;
    recommendedAction: string;
  }>;
  overallTakeaway: string;
}

interface ReviewThemeItem {
  theme: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  frequency: number;
  examples: string[];
  suggestedCopyOpportunity?: string;
}

interface ReviewAnalysisData {
  themes: ReviewThemeItem[];
  commonPraise: string[];
  commonComplaints: string[];
  websiteCopyOpportunities: Array<{
    theme: string;
    customerQuoteOrVocabulary: string;
    suggestedCopyHeadline: string;
    targetPage: string;
  }>;
  serviceImprovementOpportunities: string[];
}

interface NewsSignalItem {
  headline: string;
  source: string;
  url: string;
  date?: string;
  category: string;
  summary: string;
}

interface ChangeDetectionData {
  query: string;
  summary: string;
  rankShifts: Array<{
    domain: string;
    previousRank: number;
    currentRank: number;
    delta: number;
    url: string;
  }>;
  newEntrants: Array<{ domain: string; rank: number; title: string }>;
  droppedOut: Array<{ domain: string; rank: number; title: string }>;
}

export default function ContentAndAnalysisPage() {
  const { getToken } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string>('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'gaps' | 'messaging' | 'reviews' | 'news' | 'changes'>('gaps');

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [analyzingGaps, setAnalyzingGaps] = useState(false);
  const [analyzingMessaging, setAnalyzingMessaging] = useState(false);
  const [analyzingReviews, setAnalyzingReviews] = useState(false);
  const [analyzingNews, setAnalyzingNews] = useState(false);
  const [analyzingChanges, setAnalyzingChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [contentGapsList, setContentGapsList] = useState<ContentGapItem[]>([]);
  const [messagingData, setMessagingData] = useState<MessagingData | null>(null);
  const [reviewData, setReviewData] = useState<ReviewAnalysisData | null>(null);
  const [newsSignals, setNewsSignals] = useState<NewsSignalItem[]>([]);
  const [changeData, setChangeData] = useState<ChangeDetectionData | null>(null);
  const autoTriggeredGapsRef = React.useRef<Set<string>>(new Set());

  // Instant cache retrieval on business change
  useEffect(() => {
    if (!selectedBizId || typeof window === 'undefined') return;

    try {
      const cachedGaps = localStorage.getItem(`content_gaps_${selectedBizId}`);
      if (cachedGaps) {
        const parsed = JSON.parse(cachedGaps);
        if (Array.isArray(parsed) && parsed.length > 0) setContentGapsList(parsed);
      }

      const cachedMessaging = localStorage.getItem(`content_messaging_${selectedBizId}`);
      if (cachedMessaging) {
        const parsed = JSON.parse(cachedMessaging);
        if (parsed) setMessagingData(parsed);
      }

      const cachedReviews = localStorage.getItem(`content_reviews_${selectedBizId}`);
      if (cachedReviews) {
        const parsed = JSON.parse(cachedReviews);
        if (parsed) setReviewData(parsed);
      }

      const cachedNews = localStorage.getItem(`content_news_${selectedBizId}`);
      if (cachedNews) {
        const parsed = JSON.parse(cachedNews);
        if (Array.isArray(parsed)) setNewsSignals(parsed);
      }

      const cachedChanges = localStorage.getItem(`content_changes_${selectedBizId}`);
      if (cachedChanges) {
        const parsed = JSON.parse(cachedChanges);
        if (parsed) setChangeData(parsed);
      }
    } catch (e) {
      console.error('Failed to read content cache:', e);
    }
  }, [selectedBizId]);

  // Load business list
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

  // Trigger Content Gap Analysis
  const handleRunContentGaps = useCallback(async (targetBizId?: string) => {
    const bizId = targetBizId || selectedBizId;
    if (!bizId) return;
    setAnalyzingGaps(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await apiClient<{ count: number; contentGaps: ContentGapItem[] }>(
        `/api/businesses/${bizId}/analysis/content-gaps`,
        { method: 'POST', token }
      );
      setSuccessMsg(`Identified ${res.count} actionable content gaps!`);
      const refreshed = await apiClient<ContentGapItem[]>(`/api/businesses/${bizId}/analysis/content-gaps`, { token });
      setContentGapsList(refreshed);
      try {
        localStorage.setItem(`content_gaps_${bizId}`, JSON.stringify(refreshed));
      } catch {}
    } catch (err: any) {
      console.error('Content gap error:', err);
      setError(err.message || 'Failed to analyze content gaps');
    } finally {
      setAnalyzingGaps(false);
    }
  }, [selectedBizId, getToken]);

  // Load existing Content Gaps
  const loadContentGaps = useCallback(async () => {
    if (!selectedBizId) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const gaps = await apiClient<ContentGapItem[]>(`/api/businesses/${selectedBizId}/analysis/content-gaps`, { token });
      setContentGapsList(gaps);
      try {
        localStorage.setItem(`content_gaps_${selectedBizId}`, JSON.stringify(gaps));
      } catch {}

      // Auto-trigger if 0 content gaps found
      if (gaps.length === 0 && !autoTriggeredGapsRef.current.has(selectedBizId)) {
        autoTriggeredGapsRef.current.add(selectedBizId);
        handleRunContentGaps(selectedBizId);
      }
    } catch (err: any) {
      console.error('Failed to load content gaps:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBizId, getToken, handleRunContentGaps]);

  useEffect(() => {
    loadContentGaps();
  }, [selectedBizId, loadContentGaps]);

  // Trigger Competitor Messaging Analysis
  const handleRunMessaging = useCallback(async () => {
    if (!selectedBizId) return;
    setAnalyzingMessaging(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await apiClient<MessagingData>(`/api/businesses/${selectedBizId}/analysis/messaging`, {
        method: 'POST',
        token,
      });
      setMessagingData(res);
      try {
        localStorage.setItem(`content_messaging_${selectedBizId}`, JSON.stringify(res));
      } catch {}
      setActiveTab('messaging');
    } catch (err: any) {
      console.error('Messaging error:', err);
      setError(err.message || 'Failed to analyze competitor messaging');
    } finally {
      setAnalyzingMessaging(false);
    }
  }, [selectedBizId, getToken]);

  // Trigger Customer Review Analysis
  const handleRunReviews = useCallback(async () => {
    if (!selectedBizId) return;
    setAnalyzingReviews(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await apiClient<ReviewAnalysisData>(`/api/businesses/${selectedBizId}/analysis/reviews`, {
        method: 'POST',
        token,
      });
      setReviewData(res);
      try {
        localStorage.setItem(`content_reviews_${selectedBizId}`, JSON.stringify(res));
      } catch {}
      setActiveTab('reviews');
    } catch (err: any) {
      console.error('Review error:', err);
      setError(err.message || 'Failed to analyze reviews');
    } finally {
      setAnalyzingReviews(false);
    }
  }, [selectedBizId, getToken]);

  // Trigger News Signals Analysis
  const handleRunNews = useCallback(async () => {
    if (!selectedBizId) return;
    setAnalyzingNews(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await apiClient<NewsSignalItem[]>(`/api/businesses/${selectedBizId}/analysis/news`, {
        method: 'POST',
        token,
      });
      setNewsSignals(res);
      try {
        localStorage.setItem(`content_news_${selectedBizId}`, JSON.stringify(res));
      } catch {}
      setActiveTab('news');
    } catch (err: any) {
      console.error('News error:', err);
      setError(err.message || 'Failed to analyze news');
    } finally {
      setAnalyzingNews(false);
    }
  }, [selectedBizId, getToken]);

  // Trigger Change Detection
  const handleRunChanges = useCallback(async () => {
    if (!selectedBizId) return;
    setAnalyzingChanges(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await apiClient<ChangeDetectionData>(`/api/businesses/${selectedBizId}/analysis/changes`, {
        method: 'POST',
        token,
      });
      setChangeData(res);
      try {
        localStorage.setItem(`content_changes_${selectedBizId}`, JSON.stringify(res));
      } catch {}
      setActiveTab('changes');
    } catch (err: any) {
      console.error('Change detection error:', err);
      setError(err.message || 'Failed to detect changes');
    } finally {
      setAnalyzingChanges(false);
    }
  }, [selectedBizId, getToken]);

  // Update Gap Status
  const handleUpdateGapStatus = async (gapId: string, status: 'open' | 'in_progress' | 'completed' | 'dismissed') => {
    try {
      const token = await getToken();
      if (!token) return;
      await apiClient(`/api/analysis/content-gaps/${gapId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      });
      setContentGapsList((prev) =>
        prev.map((g) => (g.id === gapId ? { ...g, status } : g))
      );
    } catch (err: any) {
      console.error('Failed to update gap status:', err);
      setError(err.message || 'Failed to update gap status');
    }
  };

  // Metrics
  const p0Count = contentGapsList.filter((g) => g.priority === 'P0').length;
  const p1Count = contentGapsList.filter((g) => g.priority === 'P1').length;
  const openCount = contentGapsList.filter((g) => g.status === 'open' || g.status === 'in_progress').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SEO & Market Analysis</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Uncover actionable content gaps, competitor messaging patterns, customer voice, and market movements.
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
            onClick={() => handleRunContentGaps()}
            disabled={analyzingGaps || !selectedBizId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:opacity-95 shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{analyzingGaps ? 'Analyzing Gaps...' : 'Find Content Gaps'}</span>
          </button>

          <button
            onClick={handleRunMessaging}
            disabled={analyzingMessaging || !selectedBizId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors disabled:opacity-50"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>{analyzingMessaging ? 'Scanning...' : 'Messaging'}</span>
          </button>

          <button
            onClick={handleRunReviews}
            disabled={analyzingReviews || !selectedBizId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors disabled:opacity-50"
          >
            <Star className="w-3.5 h-3.5" />
            <span>{analyzingReviews ? 'Extracting...' : 'Reviews (VoC)'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between animate-fade-in shadow-xs">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between animate-fade-in shadow-xs">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overview Metrics with Elevation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Opportunities</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{openCount}</span>
            <span className="text-xs text-slate-400">content gaps</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">P0 Immediate Priority</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{p0Count}</span>
            <span className="text-xs text-rose-600 font-medium">high impact / low effort</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">P1 Strategic Priority</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">{p1Count}</span>
            <span className="text-xs text-slate-400">high impact</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Market Intelligence</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {messagingData ? 'Analyzed' : 'Ready'}
            </span>
            <span className="text-xs text-emerald-600 font-medium">AI powered</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('gaps')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'gaps'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Content Gaps ({contentGapsList.length})
          </button>
          <button
            onClick={() => {
              if (!messagingData) handleRunMessaging();
              else setActiveTab('messaging');
            }}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'messaging'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Competitor Messaging Patterns</span>
          </button>
          <button
            onClick={() => {
              if (!reviewData) handleRunReviews();
              else setActiveTab('reviews');
            }}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Review Voice (VoC)</span>
          </button>
          <button
            onClick={() => {
              if (newsSignals.length === 0) handleRunNews();
              else setActiveTab('news');
            }}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'news'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Market News Signals</span>
          </button>
          <button
            onClick={() => {
              if (!changeData) handleRunChanges();
              else setActiveTab('changes');
            }}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'changes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>SERP Change Detection</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Content Gaps */}
      {activeTab === 'gaps' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Loading content gaps...</div>
          ) : contentGapsList.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="flex items-center justify-center mb-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No Content Gaps Detected Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Compare your site against confirmed competitors to discover missing high-value service pages, location guides, and customer FAQs.
              </p>
              <button
                onClick={() => handleRunContentGaps()}
                disabled={analyzingGaps}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                {analyzingGaps ? 'Analyzing...' : 'Run Content Gap Analysis'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contentGapsList.map((gap) => (
                <div
                  key={gap.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            gap.priority === 'P0'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : gap.priority === 'P1'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {gap.priority} Priority
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded capitalize">
                          {gap.recommendedPageType} page
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100 rounded capitalize">
                          {gap.targetIntent}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-2">{gap.topic}</h3>
                    </div>

                    <select
                      value={gap.status}
                      onChange={(e) => handleUpdateGapStatus(gap.id, e.target.value as any)}
                      className="text-[11px] font-medium border border-slate-200 rounded px-2 py-1 bg-white text-slate-700"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5 border border-slate-100">
                    <p className="text-slate-500 font-semibold text-[11px]">Suggested SEO Title:</p>
                    <p className="font-medium text-slate-800 italic">"{gap.suggestedTitle}"</p>

                    {gap.suggestedHeadings && gap.suggestedHeadings.length > 0 && (
                      <div>
                        <p className="text-slate-500 font-semibold text-[11px] mt-2">Recommended Sections:</p>
                        <ul className="list-disc list-inside text-slate-700 text-[11px] space-y-0.5 mt-0.5">
                          {gap.suggestedHeadings.slice(0, 3).map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {gap.suggestedFaqs && gap.suggestedFaqs.length > 0 && (
                      <div>
                        <p className="text-slate-500 font-semibold text-[11px] mt-2">FAQs to Answer:</p>
                        <ul className="list-disc list-inside text-slate-700 text-[11px] space-y-0.5 mt-0.5">
                          {gap.suggestedFaqs.slice(0, 2).map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {gap.evidence?.competitorDomain && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Outranked by: <strong className="text-slate-600">{gap.evidence.competitorDomain}</strong></span>
                      <span className="capitalize text-slate-500">Impact: {gap.impact} • Effort: {gap.effort}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Competitor Messaging Analysis */}
      {activeTab === 'messaging' && (
        <div className="space-y-6">
          {analyzingMessaging ? (
            <div className="p-12 text-center text-sm text-slate-400">Analyzing competitor positioning...</div>
          ) : messagingData ? (
            <>
              {/* Overall Takeaway */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4">
                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Strategic Market Summary</h3>
                <p className="text-xs text-indigo-900 mt-1 leading-relaxed">{messagingData.overallTakeaway}</p>
              </div>

              {/* Market Patterns (Facts vs AI Interpretation vs Action) */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Observed Market Patterns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {messagingData.marketPatterns.map((p, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900">{p.pattern}</h4>
                      </div>

                      <div className="text-xs space-y-1.5">
                        <div className="p-2 bg-slate-50 rounded border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Observed Evidence:</span>
                          <p className="text-slate-700 italic text-[11px] mt-0.5">"{p.observedFacts.join('", "')}"</p>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Market Meaning:</span>
                          <p className="text-slate-600 text-[11px] mt-0.5">{p.aiInterpretation}</p>
                        </div>

                        <div className="p-2 bg-indigo-50/60 rounded border border-indigo-100">
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Recommended Counter-Action:</span>
                          <p className="text-indigo-950 font-medium text-[11px] mt-0.5">{p.recommendedAction}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Competitor Profiles Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-800">Competitor Positioning Matrix</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="py-2.5 px-4 font-semibold">Competitor</th>
                        <th className="py-2.5 px-3 font-semibold">Primary Headline / Offer</th>
                        <th className="py-2.5 px-3 font-semibold">Differentiator</th>
                        <th className="py-2.5 px-3 font-semibold">Call to Action</th>
                        <th className="py-2.5 px-4 font-semibold">Trust Signals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {messagingData.competitors.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{c.competitorName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{c.domain}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">{c.primaryOffer || c.headline}</div>
                            {c.priceLanguage && <span className="text-[10px] text-emerald-700 font-semibold">{c.priceLanguage}</span>}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{c.differentiator}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                              {c.cta}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {c.trustSignals.map((t, idx) => (
                                <span key={idx} className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <button
                onClick={handleRunMessaging}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                Scan Competitor Messaging
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Customer Review Voice (VoC) */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {analyzingReviews ? (
            <div className="p-12 text-center text-sm text-slate-400">Extracting customer review themes...</div>
          ) : reviewData ? (
            <>
              {/* Praise vs Complaints Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Top Customer Praise</h3>
                  <ul className="space-y-1 text-xs text-emerald-900">
                    {reviewData.commonPraise.map((p, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Recurring Market Complaints</h3>
                  <ul className="space-y-1 text-xs text-rose-900">
                    {reviewData.commonComplaints.map((c, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Website Copy Opportunities */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">High-Converting Website Copy Opportunities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviewData.websiteCopyOpportunities.map((op, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {op.targetPage}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Theme: {op.theme}</span>
                      </div>

                      <div className="text-xs">
                        <span className="text-[10px] text-slate-400 block font-semibold">Natural Customer Vocabulary:</span>
                        <p className="text-slate-700 italic text-[11px] mt-0.5">"{op.customerQuoteOrVocabulary}"</p>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Suggested Headline:</span>
                        <p className="font-bold text-slate-900 text-xs mt-0.5">"{op.suggestedCopyHeadline}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <button
                onClick={handleRunReviews}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                Extract Review Voice (VoC)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: News Signals */}
      {activeTab === 'news' && (
        <div className="space-y-4">
          {analyzingNews ? (
            <div className="p-12 text-center text-sm text-slate-400">Scanning news signals...</div>
          ) : newsSignals.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="flex items-center justify-center mb-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <Newspaper className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No News Signals Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Scan Google News for industry expansion, competitor activity, and local market trends.
              </p>
              <button
                onClick={handleRunNews}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                Scan Google News Signals
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsSignals.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        item.category === 'opportunity'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.category === 'competitive_activity'
                          ? 'bg-purple-100 text-purple-800'
                          : item.category === 'reputation_risk'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.category.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.source}</span>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-slate-900 text-xs hover:text-indigo-600 block line-clamp-2"
                  >
                    {item.headline}
                  </a>

                  <p className="text-xs text-slate-600">{item.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: SERP Change Detection */}
      {activeTab === 'changes' && (
        <div className="space-y-4">
          {analyzingChanges ? (
            <div className="p-12 text-center text-sm text-slate-400">Comparing search runs...</div>
          ) : changeData ? (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">SERP Movement Summary</h3>
                <p className="text-xs text-indigo-900 mt-1">{changeData.summary}</p>
              </div>

              {changeData.rankShifts.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 px-4 font-semibold">Competitor Domain</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Previous Rank</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Current Rank</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Position Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {changeData.rankShifts.map((shift, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{shift.domain}</td>
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">#{shift.previousRank}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800 font-mono">#{shift.currentRank}</td>
                          <td className="py-3 px-3 text-center">
                            {shift.delta > 0 ? (
                              <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                ↑ Climbed +{shift.delta}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                                ↓ Slipped {shift.delta}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                  No rank shifts detected between the latest completed runs.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <button
                onClick={handleRunChanges}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                Detect SERP Changes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
