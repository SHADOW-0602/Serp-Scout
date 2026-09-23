'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';
import {
  MapPin,
  Search,
  Star,
  MessageSquare,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Building2,
  PhoneCall,
  Flame,
  ArrowRight,
  Loader2,
  Camera,
  Tags,
  Award,
  CheckSquare,
  Square,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

interface BusinessSummary {
  id: string;
  name: string;
  city?: string;
  websiteUrl: string;
  industry?: string;
}

interface MapResultItem {
  id: string;
  rank: number;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  rating?: string;
  reviewCount?: number;
  locationText?: string;
}

interface ReviewThemeItem {
  theme: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  frequency: number;
  examples: string[];
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

export default function LocalSeoPage() {
  const { getToken } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string>('');
  const [loadingBiz, setLoadingBiz] = useState(true);

  // Map Pack Scanner State
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [scanning, setScanning] = useState(false);
  const [mapResults, setMapResults] = useState<MapResultItem[]>([]);
  const [scanTimestamp, setScanTimestamp] = useState<string | null>(null);

  // Review Sentiment Analysis State
  const [analyzingReviews, setAnalyzingReviews] = useState(false);
  const [reviewAnalysis, setReviewAnalysis] = useState<ReviewAnalysisData | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map_pack' | 'reviews' | 'checklist'>('map_pack');

  // Location Autocomplete Search State for Local SEO
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{
    id: string;
    name: string;
    city?: string;
    address?: string;
    category?: string;
    type: 'location' | 'place';
  }>>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDebounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Interactive Checklist Action State per Business
  const [checklistCompleted, setChecklistCompleted] = useState<Record<string, boolean>>({});

  const toggleChecklistItem = (itemKey: string) => {
    setChecklistCompleted((prev) => {
      const next = { ...prev, [itemKey]: !prev[itemKey] };
      try {
        if (selectedBizId) {
          localStorage.setItem(`local_seo_checklist_${selectedBizId}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  };

  const autoTriggeredMapsRef = React.useRef<Set<string>>(new Set());
  const autoTriggeredReviewsRef = React.useRef<Set<string>>(new Set());

  // Restore saved results from localStorage on business change
  useEffect(() => {
    if (!selectedBizId || typeof window === 'undefined') return;

    // 1. Instant cache retrieval for Maps
    try {
      const cachedMaps = localStorage.getItem(`local_seo_maps_${selectedBizId}`);
      if (cachedMaps) {
        const parsed = JSON.parse(cachedMaps);
        if (parsed.results && parsed.results.length > 0) {
          setMapResults(parsed.results);
          setScanTimestamp(parsed.timestamp || null);
        }
      }
    } catch (e) {
      console.error('Failed to read local maps cache:', e);
    }

    // 2. Instant cache retrieval for Reviews
    try {
      const cachedReviews = localStorage.getItem(`local_seo_reviews_${selectedBizId}`);
      if (cachedReviews) {
        const parsed = JSON.parse(cachedReviews);
        if (parsed && parsed.themes) {
          setReviewAnalysis(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to read local reviews cache:', e);
    }

    // 3. Instant cache retrieval for Checklist
    try {
      const cachedChecklist = localStorage.getItem(`local_seo_checklist_${selectedBizId}`);
      if (cachedChecklist) {
        const parsed = JSON.parse(cachedChecklist);
        if (parsed && typeof parsed === 'object') {
          setChecklistCompleted(parsed);
        }
      } else {
        setChecklistCompleted({});
      }
    } catch (e) {
      console.error('Failed to read local checklist cache:', e);
    }
  }, [selectedBizId]);

  // Load businesses
  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        if (!token) return;
        const list = await apiClient<BusinessSummary[]>('/api/businesses', { token });
        setBusinesses(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedBizId(first.id);
          setLocation(first.city || '');
          setQuery(`${first.industry || 'Service'} in ${first.city || 'Austin'}`);
        }
      } catch (err: any) {
        console.error('Failed to load businesses:', err);
        setError(err.message || 'Failed to load workspace businesses');
      } finally {
        setLoadingBiz(false);
      }
    }
    load();
  }, [getToken]);

  const handleLocationInputChange = (val: string) => {
    setLocation(val);
    setShowLocationDropdown(true);

    if (locationDebounceTimer.current) {
      clearTimeout(locationDebounceTimer.current);
    }

    if (!val || val.trim().length < 2) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    setIsSearchingLocation(true);
    locationDebounceTimer.current = setTimeout(async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await apiClient<Array<{
          id: string;
          name: string;
          city?: string;
          address?: string;
          category?: string;
          type: 'location' | 'place';
        }>>(`/api/businesses/locations/search?q=${encodeURIComponent(val.trim())}`, { token });
        setLocationSuggestions(res || []);
      } catch (err) {
        console.error('Location search error:', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 350);
  };

  const handleSelectLocation = (item: {
    name: string;
    city?: string;
    address?: string;
    category?: string;
  }) => {
    const resolvedCity = item.city || item.name;
    setLocation(resolvedCity);
    const selectedBiz = businesses.find((b) => b.id === selectedBizId);
    setQuery(`${selectedBiz?.industry || 'Services'} in ${resolvedCity}`);
    setShowLocationDropdown(false);
  };

  // Execute Live Google Maps 3-Pack Scan (or refresh)
  const handleScanMaps = useCallback(async (e?: React.FormEvent, forceRefresh = false) => {
    if (e) e.preventDefault();
    if (!selectedBizId || !query.trim()) return;

    setScanning(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication expired.');

      const res = await apiClient<{
        id: string;
        results?: MapResultItem[];
        requestedAt: string;
      }>(`/api/businesses/${selectedBizId}/searches`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          query: query.trim(),
          searchType: 'google_maps',
          location: location.trim() || undefined,
          num: 15,
        }),
      });

      const nowTime = new Date().toLocaleTimeString();
      if (res.results && res.results.length > 0) {
        setMapResults(res.results);
        setScanTimestamp(nowTime);
        // Persist to localStorage to save API calls on future visits
        try {
          localStorage.setItem(
            `local_seo_maps_${selectedBizId}`,
            JSON.stringify({ results: res.results, timestamp: nowTime })
          );
        } catch (storageErr) {
          console.error('Could not save maps to localStorage:', storageErr);
        }
      } else {
        setMapResults([]);
        setScanTimestamp(nowTime);
      }
    } catch (err: any) {
      console.error('Maps scan error:', err);
      setError(err.message || 'Google Maps scan failed. Please check your API keys and try again.');
      setMapResults([]);
    } finally {
      setScanning(false);
    }
  }, [selectedBizId, query, location, getToken]);

  // Load existing search history from DB or auto-trigger initial scan
  useEffect(() => {
    if (!selectedBizId || loadingBiz) return;

    let isMounted = true;

    async function loadDbHistoryOrAutoScan() {
      try {
        const token = await getToken();
        if (!token) return;

        // Check if we already have map results loaded from cache
        if (mapResults.length > 0) return;

        // Check backend DB for previous search runs for this business
        const runs = await apiClient<any[]>(`/api/businesses/${selectedBizId}/searches?limit=10`, { token });
        const mapsRun = runs.find((r) => r.searchType === 'google_maps' && r.status === 'completed');

        if (mapsRun && isMounted) {
          const runDetails = await apiClient<any>(`/api/searches/run/${mapsRun.id}`, { token });
          if (runDetails?.results && runDetails.results.length > 0 && isMounted) {
            const formattedResults: MapResultItem[] = runDetails.results.map((r: any) => ({
              id: r.id,
              rank: r.rank,
              title: r.title,
              url: r.url,
              domain: r.domain,
              snippet: r.snippet,
              rating: r.rating,
              reviewCount: r.reviewCount,
              locationText: r.locationText,
            }));
            setMapResults(formattedResults);
            const timeStr = new Date(mapsRun.completedAt || mapsRun.requestedAt).toLocaleTimeString();
            setScanTimestamp(timeStr);
            try {
              localStorage.setItem(
                `local_seo_maps_${selectedBizId}`,
                JSON.stringify({ results: formattedResults, timestamp: timeStr })
              );
            } catch {}
            return;
          }
        }

        // If no saved results in DB or cache, automatically run scan once
        if (!autoTriggeredMapsRef.current.has(selectedBizId) && isMounted) {
          autoTriggeredMapsRef.current.add(selectedBizId);
          handleScanMaps();
        }
      } catch (err) {
        console.error('Error fetching search history:', err);
      }
    }

    loadDbHistoryOrAutoScan();

    return () => {
      isMounted = false;
    };
  }, [selectedBizId, loadingBiz, getToken, mapResults.length, handleScanMaps]);

  // Run AI Review Sentiment & Opportunities Analysis
  const handleAnalyzeReviews = async () => {
    if (!selectedBizId) return;
    setAnalyzingReviews(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication expired.');

      const data = await apiClient<ReviewAnalysisData>(
        `/api/businesses/${selectedBizId}/analysis/reviews`,
        {
          token,
          method: 'POST',
        }
      );
      setReviewAnalysis(data);
      try {
        localStorage.setItem(`local_seo_reviews_${selectedBizId}`, JSON.stringify(data));
      } catch (storageErr) {
        console.error('Could not save reviews to localStorage:', storageErr);
      }
    } catch (err: any) {
      console.error('Review analysis error:', err);
      setError(err.message || 'Review analysis failed. Please try again.');
      setReviewAnalysis(null);
    } finally {
      setAnalyzingReviews(false);
    }
  };

  const selectedBiz = businesses.find((b) => b.id === selectedBizId);

  if (loadingBiz) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
          <span className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
          Loading Local SEO Intelligence...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── 1. HEADER WITH BUSINESS SELECTOR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white flex items-center justify-center shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Local SEO & Google Maps
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Track Google Maps 3-Pack positions, sentiment gaps, and local competitor proximity.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {businesses.length > 1 && (
            <select
              value={selectedBizId}
              onChange={(e) => {
                const b = businesses.find((biz) => biz.id === e.target.value);
                setSelectedBizId(e.target.value);
                if (b) {
                  setLocation(b.city || '');
                  setQuery(`${b.industry || 'Services'} in ${b.city || 'Austin'}`);
                }
              }}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 shadow-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.name} ({biz.city || 'Local'})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => handleScanMaps()}
            disabled={scanning}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:opacity-95 shadow-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            {scanning ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Auditing Maps 3-Pack...
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                Live Maps Audit
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 2. STATS & QUICK HIGHLIGHTS (COMPUTED LIVE FROM AUDIT DATA) ── */}
      {(() => {
        const selectedBiz = businesses.find((b) => b.id === selectedBizId);
        const myRankItem = mapResults.find(
          (m) =>
            (selectedBiz?.name && m.title.toLowerCase().includes(selectedBiz.name.toLowerCase())) ||
            (selectedBiz?.websiteUrl && m.url && m.url.includes(new URL(selectedBiz.websiteUrl).hostname.replace(/^www\./, '')))
        );

        const averageRivalRating =
          mapResults.length > 0
            ? (
                mapResults.reduce((acc, curr) => acc + (parseFloat(curr.rating || '0') || 0), 0) /
                (mapResults.filter((m) => m.rating).length || 1)
              ).toFixed(1)
            : '4.8';

        const totalReviewsAudited = mapResults.reduce(
          (acc, curr) => acc + (curr.reviewCount || 0),
          0
        );

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Google Maps 3-Pack Presence
                </span>
                <span className={`p-1.5 rounded-lg ${myRankItem && myRankItem.rank <= 3 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {myRankItem ? `#${myRankItem.rank} in 3-Pack` : mapResults.length > 0 ? 'Top 10 Contender' : 'Awaiting Audit'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {myRankItem ? `Ranked #${myRankItem.rank} in local customer radius` : `${mapResults.length} local competitors analyzed`}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Local Pack Rating Benchmark
                </span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Star className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-indigo-600 mt-2 flex items-center gap-1.5">
                <span>{myRankItem?.rating || averageRivalRating}</span>
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-slate-400">
                  ({myRankItem ? `${myRankItem.reviewCount || 0} reviews` : `avg ${averageRivalRating}`})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {totalReviewsAudited > 0 ? `${totalReviewsAudited} total customer reviews benchmarked` : 'Direct trust differentiator against rivals'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Audited Target Territory
                </span>
                <span className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-cyan-700 mt-2 truncate">
                {location ? location : 'Indirapuram'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Direct phone calls & directions focused</p>
            </div>
          </div>
        );
      })()}

      {/* ── 3. TAB NAVIGATION ── */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('map_pack')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'map_pack'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Live Google Maps 3-Pack
        </button>

        <button
          onClick={() => {
            setActiveTab('reviews');
            if (!reviewAnalysis) handleAnalyzeReviews();
          }}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'reviews'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Review Sentiment & Copy Hooks
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'checklist'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Local SEO Optimization Protocol
        </button>
      </div>

      {/* ── 4. TAB CONTENT ── */}

      {/* TAB 1: GOOGLE MAPS 3-PACK SCANNER */}
      {activeTab === 'map_pack' && (
        <div className="space-y-6 animate-fade-in">
          {/* Search Query Simulator */}
          <form
            onSubmit={handleScanMaps}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. dentist in Austin, plumber near me..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="relative w-full md:w-72">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={location}
                onChange={(e) => handleLocationInputChange(e.target.value)}
                onFocus={() => {
                  if (locationSuggestions.length > 0) setShowLocationDropdown(true);
                }}
                placeholder="City, Pincode, or Clinic"
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {isSearchingLocation && (
                <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}

              {/* Autocomplete Dropdown */}
              {showLocationDropdown && locationSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                  {locationSuggestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectLocation(item)}
                      className="p-3 hover:bg-indigo-50/60 cursor-pointer transition flex items-start gap-2.5 text-left"
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        item.type === 'place'
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      }`}>
                        {item.type === 'place' ? (
                          <Building2 className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                            {item.category}
                          </span>
                        </div>
                        {item.address && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.address}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={scanning}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-sm transition disabled:opacity-50 whitespace-nowrap"
            >
              {scanning ? 'Auditing SERP...' : 'Scan 3-Pack Now'}
            </button>
          </form>

          {/* Results Display */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Google Maps 3-Pack Radar</span>
                  {scanTimestamp && (
                    <span className="text-[11px] font-normal text-slate-400">
                      (Last audited: {scanTimestamp})
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simulating buyer queries seeking immediate phone calls and directions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {scanTimestamp && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Saved locally
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Google Maps Engine
                </span>
              </div>
            </div>

            {mapResults.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">No Map Pack Audited Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click <strong>&quot;Scan 3-Pack Now&quot;</strong> above to query live Google Maps rankings for your business in {location || 'your area'}.
                </p>
                <button
                  onClick={() => handleScanMaps()}
                  className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm transition"
                >
                  Run Instant Audit →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {mapResults.map((item, idx) => {
                  const isTopPack = item.rank <= 3;
                  return (
                    <div
                      key={item.id || idx}
                      className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                        isTopPack ? 'bg-indigo-50/20 hover:bg-indigo-50/40' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                            item.rank === 1
                              ? 'bg-amber-400 text-slate-900 shadow-sm'
                              : item.rank <= 3
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{item.rank}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                            {isTopPack && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                3-PACK FEATURED
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            {item.rating && (
                              <span className="font-semibold text-amber-600 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>{item.rating}</span>
                                {item.reviewCount ? ` (${item.reviewCount} reviews)` : ''}
                              </span>
                            )}
                            {item.locationText && <span>• {item.locationText}</span>}
                          </div>

                          {item.snippet && (
                            <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                              {item.snippet}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REVIEW SENTIMENT & WEBSITE COPY HOOKS */}
      {activeTab === 'reviews' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase tracking-wide">
                AI Voice of Customer
              </span>
              <h3 className="text-lg font-bold mt-2">
                Turn Competitor Review Frustrations Into Your Best Headlines
              </h3>
              <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                Serp-Scout extracts exact customer vocabulary from reviews to identify weaknesses in your local rivals and write conversion-tested website copy.
              </p>
            </div>

            <button
              onClick={handleAnalyzeReviews}
              disabled={analyzingReviews}
              className="px-5 py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs hover:bg-indigo-50 shadow-sm transition disabled:opacity-50 shrink-0 flex items-center gap-2"
            >
              {analyzingReviews ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-indigo-900 border-t-transparent rounded-full animate-spin"></span>
                  Analyzing Reviews...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Refresh AI Review Insights
                </>
              )}
            </button>
          </div>

          {reviewAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Review Themes */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-indigo-600" />
                  Dominant Customer Review Themes
                </h4>

                <div className="space-y-3">
                  {reviewAnalysis.themes.map((theme, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{theme.theme}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            theme.sentiment === 'positive'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {theme.sentiment.toUpperCase()} • {theme.frequency}x
                        </span>
                      </div>
                      <div className="space-y-1">
                        {theme.examples.map((ex, i) => (
                          <p key={i} className="text-[11px] text-slate-600 italic">
                            &quot;{ex}&quot;
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Copy Opportunities */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  High-Converting Copy Opportunities
                </h4>

                <div className="space-y-3">
                  {reviewAnalysis.websiteCopyOpportunities.map((opp, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-900 uppercase">
                          {opp.theme}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {opp.targetPage}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">
                          Recommended Headline
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                          &quot;{opp.suggestedCopyHeadline}&quot;
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        <strong>Customer Vocabulary:</strong> {opp.customerQuoteOrVocabulary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LOCAL PROTOCOL CHECKLIST (LIVE AUDIT ENGINE) */}
      {activeTab === 'checklist' && (() => {
        const selectedBiz = businesses.find((b) => b.id === selectedBizId);
        const myRankItem = mapResults.find(
          (m) =>
            (selectedBiz?.name && m.title.toLowerCase().includes(selectedBiz.name.toLowerCase())) ||
            (selectedBiz?.websiteUrl && m.url && m.url.includes(new URL(selectedBiz.websiteUrl).hostname.replace(/^www\./, '')))
        );

        const is3PackWinner = Boolean(myRankItem && myRankItem.rank <= 3);
        const hasVerifiedDomain = Boolean(selectedBiz?.websiteUrl && selectedBiz.websiteUrl.startsWith('http'));
        const hasTargetLocation = Boolean(location && location.trim().length > 0);
        const hasReviewsAudited = (reviewAnalysis?.themes?.length || 0) > 0 || (myRankItem?.reviewCount || 0) > 0;

        const auditSignals = [
          {
            id: 'signal_1',
            title: '1. Google 3-Pack Placement & Local Radar',
            category: 'Proximity & Authority',
            status: is3PackWinner ? 'passed' : myRankItem ? 'warning' : 'critical',
            badgeText: is3PackWinner
              ? `Passed (Rank #${myRankItem?.rank})`
              : myRankItem
              ? `Rank #${myRankItem.rank} (Needs Boost)`
              : 'Not In 3-Pack',
            summary: is3PackWinner
              ? `Your profile is capturing maximum search visibility inside Google's 3-Pack for local searchers.`
              : `Currently competing against ${mapResults.length || 'local'} rivals. You must optimize category authority and citation velocity to break into the Top 3.`,
            metrics: [
              { label: 'Current Rank', value: myRankItem ? `#${myRankItem.rank}` : 'Unranked' },
              { label: 'Scanned Rivals', value: `${mapResults.length} Competitors` },
              { label: 'Pack Cutoff', value: 'Rank #3' },
            ],
            checklist: [
              {
                id: 'sig1_cat_match',
                task: 'Align GBP primary category with the #1 ranking competitor',
                priority: 'High',
                detail: 'Ensure your primary business category precisely reflects high-intent search terms (e.g., "Dental Clinic" vs "Dentist").',
              },
              {
                id: 'sig1_geotag_media',
                task: 'Upload 5+ fresh geotagged clinic/storefront photos monthly',
                priority: 'High',
                detail: 'Fresh imagery signals active operation to Google Maps ranking algorithms and boosts click-through conversion.',
              },
              {
                id: 'sig1_complete_profile',
                task: 'Attain 100% Google Business Profile completion score',
                priority: 'Medium',
                detail: 'Populate exact operating hours, special holiday schedules, booking links, and service menus.',
              },
            ],
          },
          {
            id: 'signal_2',
            title: '2. Canonical NAP & Website Domain Linkage',
            category: 'Citation Integrity',
            status: hasVerifiedDomain ? 'passed' : 'critical',
            badgeText: hasVerifiedDomain ? 'Verified' : 'Action Needed',
            summary: hasVerifiedDomain
              ? `Canonical website linkage confirmed for ${selectedBiz?.websiteUrl}. Name, Address, and Phone must stay strictly identical across directories.`
              : `No verified website URL linked to this business profile. Unlinked profiles suffer heavy local algorithmic rank suppression.`,
            metrics: [
              { label: 'Canonical URL', value: selectedBiz?.websiteUrl ? new URL(selectedBiz.websiteUrl).hostname : 'Missing' },
              { label: 'SSL Protocol', value: selectedBiz?.websiteUrl?.startsWith('https') ? 'HTTPS Active' : 'Non-SSL' },
              { label: 'Schema Target', value: 'LocalBusiness (JSON-LD)' },
            ],
            checklist: [
              {
                id: 'sig2_schema_embed',
                task: 'Deploy LocalBusiness Schema markup in website header/footer',
                priority: 'High',
                detail: 'Include name, address, telephone, geo coordinates, and opening hours in structured JSON-LD for Google crawler validation.',
              },
              {
                id: 'sig2_utm_tracking',
                task: 'Tag GBP website URL with UTM campaign parameters',
                priority: 'Medium',
                detail: 'Append ?utm_source=google&utm_medium=organic&utm_campaign=gbp to isolate high-intent local organic traffic in analytics.',
              },
              {
                id: 'sig2_nap_consistency',
                task: 'Standardize Name, Address, and Phone across all external directories',
                priority: 'High',
                detail: 'Eliminate minor variations (St vs Street, suite numbers, old phone numbers) on Justdial, Sulekha, and Apple Maps.',
              },
            ],
          },
          {
            id: 'signal_3',
            title: '3. Voice of Customer & Review Velocity',
            category: 'Trust & Sentiment Signals',
            status: hasReviewsAudited ? 'passed' : 'warning',
            badgeText: hasReviewsAudited ? 'Audited' : 'Review Gap',
            summary: myRankItem?.rating
              ? `Maintaining ${myRankItem.rating}★ across ${myRankItem.reviewCount || 0} reviews. Consistent positive review intake outpaces local competitors.`
              : `Review signals require continuous velocity. Profiles with frequent new positive reviews receive superior local rank bias.`,
            metrics: [
              { label: 'Star Rating', value: myRankItem?.rating ? `${myRankItem.rating} ★` : '4.5+ Goal' },
              { label: 'Review Count', value: myRankItem?.reviewCount ? `${myRankItem.reviewCount}` : 'Audit Needed' },
              { label: 'Response Target', value: '100% within 24h' },
            ],
            checklist: [
              {
                id: 'sig3_reply_sla',
                task: 'Establish a 24-hour response SLA for 100% of reviews',
                priority: 'High',
                detail: 'Google rewards businesses that actively engage with reviews. Include polite, keyword-rich acknowledgments.',
              },
              {
                id: 'sig3_keyword_copy',
                task: 'Inject dominant positive review themes into landing page copy',
                priority: 'Medium',
                detail: 'Incorporate real patient phrases identified by AI (e.g., painless treatment, friendly staff) into website headings.',
              },
              {
                id: 'sig3_automated_funnel',
                task: 'Deploy automated post-visit review requests via WhatsApp/SMS',
                priority: 'High',
                detail: 'Send direct Google Review short-links within 2 hours of customer service completion to maximize 5-star intake velocity.',
              },
            ],
          },
          {
            id: 'signal_4',
            title: '4. Geographic Territory & Radius Targeting',
            category: 'Hyper-Local Proximity',
            status: hasTargetLocation ? 'passed' : 'warning',
            badgeText: hasTargetLocation ? 'Active Target' : 'Global (Untargeted)',
            summary: `Simulating search queries anchored to ${location || 'Indirapuram'}. Google prioritizes businesses with tight proximity and localized service zones.`,
            metrics: [
              { label: 'Target Territory', value: location || 'Indirapuram' },
              { label: 'Effective Radius', value: '3 - 8 km' },
              { label: 'Market Mode', value: 'High Density' },
            ],
            checklist: [
              {
                id: 'sig4_service_areas',
                task: 'Explicitly configure all sub-localities in Google Business Profile',
                priority: 'High',
                detail: 'List surrounding sectors, neighborhoods, and landmark areas as official service areas to expand your proximity halo.',
              },
              {
                id: 'sig4_local_pages',
                task: 'Build dedicated neighborhood landing pages with driving directions',
                priority: 'Medium',
                detail: 'Create localized pages mentioning prominent crossroads, transit stations, and community landmarks.',
              },
              {
                id: 'sig4_hyperlocal_citations',
                task: 'Acquire 3+ hyper-local directory citations and community links',
                priority: 'Medium',
                detail: 'Get listed on local resident welfare portals, neighborhood business directories, and regional healthcare listings.',
              },
            ],
          },
        ];

        // Compute total checklist progress
        const allChecklistItems = auditSignals.flatMap((s) => s.checklist);
        const totalItems = allChecklistItems.length;
        const completedCount = allChecklistItems.filter((i) => checklistCompleted[i.id]).length;
        const progressPercentage = Math.round((completedCount / totalItems) * 100);

        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8 animate-fade-in">
            {/* Header with Live Score & Progress */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-slate-900">
                    Google Business Profile (GBP) Live Audit Protocol
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Telemetry
                  </span>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Continuous multi-point algorithmic audit of your local SEO signals for{' '}
                  <strong className="text-slate-800">{selectedBiz?.name || 'Your Business'}</strong> in{' '}
                  <strong className="text-indigo-600">{location || 'Indirapuram'}</strong>.
                </p>
              </div>

              {/* Progress Summary Cards */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Core Signals Passed</div>
                  <div className="text-base font-black text-emerald-600">
                    {Number(is3PackWinner) + Number(hasVerifiedDomain) + Number(hasTargetLocation) + Number(hasReviewsAudited)} / 4
                  </div>
                </div>

                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-4 py-2.5 min-w-[160px]">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-indigo-900 mb-1">
                    <span>Protocol Checklist</span>
                    <span>{progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-indigo-200/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-indigo-700/80 font-medium text-right mt-1">
                    {completedCount} of {totalItems} tasks completed
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Core Signal Audit Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {auditSignals.map((signal) => {
                const isPassed = signal.status === 'passed';
                const isWarning = signal.status === 'warning';

                return (
                  <div
                    key={signal.id}
                    className={`rounded-2xl border p-5 sm:p-6 space-y-5 transition-all shadow-xs ${
                      isPassed
                        ? 'border-emerald-200/80 bg-emerald-50/20'
                        : isWarning
                        ? 'border-amber-200/80 bg-amber-50/20'
                        : 'border-rose-200/80 bg-rose-50/20'
                    }`}
                  >
                    {/* Header: Title & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {signal.category}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          {signal.title}
                        </h4>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                          isPassed
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        {signal.badgeText}
                      </span>
                    </div>

                    {/* Summary Description */}
                    <p className="text-xs text-slate-600 leading-relaxed">{signal.summary}</p>

                    {/* Live Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                      {signal.metrics.map((m, idx) => (
                        <div key={idx} className="text-center">
                          <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-600">
                            {m.label}
                          </div>
                          <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                            {m.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actionable Interactive Checklist */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                        <span>Actionable Optimization Tasks</span>
                        <span className="text-[10px] font-semibold text-slate-600">
                          {signal.checklist.filter((item) => checklistCompleted[item.id]).length} / {signal.checklist.length} Done
                        </span>
                      </div>

                      <div className="space-y-2">
                        {signal.checklist.map((item) => {
                          const isChecked = Boolean(checklistCompleted[item.id]);

                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleChecklistItem(item.id)}
                              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 select-none ${
                                isChecked
                                  ? 'bg-emerald-50/60 border-emerald-200 text-slate-600 line-through'
                                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800 shadow-2xs'
                              }`}
                            >
                              <div className="pt-0.5 shrink-0">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                                )}
                              </div>

                              <div className="space-y-1 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`font-semibold ${isChecked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                    {item.task}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                                      item.priority === 'High'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {item.priority}
                                  </span>
                                </div>
                                <p className={`text-[11px] leading-relaxed ${isChecked ? 'text-slate-500' : 'text-slate-600'}`}>
                                  {item.detail}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
