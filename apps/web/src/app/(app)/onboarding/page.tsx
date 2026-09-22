'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';
import {
  MapPin,
  TrendingUp,
  Activity,
  Sparkles,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface OnboardingFormData {
  businessName: string;
  websiteUrl: string;
  industry: string;
  country: string;
  city: string;
  serviceArea: string;
  servicesInput: string;
  primaryGoal: string;
}

const PRIMARY_GOALS = [
  'More qualified phone calls & inquiries',
  'More online bookings or quote requests',
  'Improved local Google Maps Pack visibility',
  'Outrank direct local competitors',
  'Fix content gaps and missing service pages',
];

const INDUSTRIES = [
  'Dental & Healthcare',
  'Home Services & Trades',
  'Legal & Financial Services',
  'Real Estate',
  'Fitness & Wellness',
  'Restaurants & Hospitality',
  'Professional Consulting',
  'Local Retail',
  'Other',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'agency'>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('Dental & Healthcare');
  const [customIndustry, setCustomIndustry] = useState<string>('');

  const [formData, setFormData] = useState<OnboardingFormData>({
    businessName: '',
    websiteUrl: '',
    industry: 'Dental & Healthcare',
    country: 'United States',
    city: '',
    serviceArea: '',
    servicesInput: '',
    primaryGoal: PRIMARY_GOALS[0],
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryCompany = params.get('company') || params.get('businessName');
      const queryUrl = params.get('url') || params.get('websiteUrl');
      const queryPlan = params.get('plan') || localStorage.getItem('serp_scout_selected_plan');
      const queryBilling = params.get('billing') || localStorage.getItem('serp_scout_billing_cycle');
      const savedCompany = localStorage.getItem('serp_scout_pending_company');

      if (queryPlan === 'starter' || queryPlan === 'pro' || queryPlan === 'agency') {
        setSelectedPlan(queryPlan);
      }
      if (queryBilling === 'monthly' || queryBilling === 'annual') {
        setBillingCycle(queryBilling);
      }

      const targetCompany = queryCompany || savedCompany;
      if (targetCompany) {
        const isUrl = targetCompany.includes('.') || targetCompany.startsWith('http');
        setFormData((prev) => ({
          ...prev,
          businessName: prev.businessName || (isUrl ? targetCompany.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '') : targetCompany),
          websiteUrl: prev.websiteUrl || (isUrl ? (targetCompany.startsWith('http') ? targetCompany : `https://${targetCompany}`) : ''),
        }));
      }
      if (queryUrl) {
        setFormData((prev) => ({
          ...prev,
          websiteUrl: queryUrl.startsWith('http') ? queryUrl : `https://${queryUrl}`,
        }));
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedIndustry(val);
    if (val !== 'Other') {
      setFormData((prev) => ({ ...prev, industry: val }));
    } else {
      setFormData((prev) => ({ ...prev, industry: customIndustry.trim() || 'Other' }));
    }
  };

  const handleCustomIndustryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomIndustry(val);
    setFormData((prev) => ({ ...prev, industry: val.trim() || 'Other' }));
  };

  const validateStep1 = () => {
    if (!formData.businessName.trim()) {
      setError('Business name is required.');
      return false;
    }
    if (!formData.websiteUrl.trim()) {
      setError('Website URL is required.');
      return false;
    }
    try {
      const url = new URL(formData.websiteUrl.startsWith('http') ? formData.websiteUrl : `https://${formData.websiteUrl}`);
      if (!['http:', 'https:'].includes(url.protocol)) {
        setError('Please enter a valid web URL (http or https).');
        return false;
      }
    } catch {
      setError('Please enter a valid website address (e.g., https://example.com).');
      return false;
    }
    if (selectedIndustry === 'Other' && !customIndustry.trim()) {
      setError('Please enter your primary industry.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!formData.city.trim()) {
      setError('City/location is required for local competitive analysis.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication session expired. Please sign in again.');
      }

      // 1. Ensure user has a workspace created
      let workspaceId: string;
      try {
        const myWs = await apiClient<{ activeWorkspace: { id: string } | null }>('/api/workspaces/me', { token });
        if (myWs.activeWorkspace) {
          workspaceId = myWs.activeWorkspace.id;
        } else {
          // Create new workspace
          const newWs = await apiClient<{ id: string }>('/api/workspaces', {
            token,
            method: 'POST',
            body: JSON.stringify({
              name: `${formData.businessName} Workspace`,
              plan: selectedPlan,
            }),
          });
          workspaceId = newWs.id;
        }
      } catch {
        // Fallback workspace creation
        const newWs = await apiClient<{ id: string }>('/api/workspaces', {
          token,
          method: 'POST',
          body: JSON.stringify({
            name: `${formData.businessName} Workspace`,
            plan: selectedPlan,
          }),
        });
        workspaceId = newWs.id;
      }

      // 2. Parse services from comma-separated input
      const servicesList = formData.servicesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name, idx) => ({
          name,
          priority: idx + 1,
        }));

      // Normalize website URL format
      const formattedUrl = formData.websiteUrl.startsWith('http')
        ? formData.websiteUrl
        : `https://${formData.websiteUrl}`;

      const effectiveIndustry =
        selectedIndustry === 'Other'
          ? (customIndustry.trim() || 'Other')
          : (formData.industry || selectedIndustry);

      // 3. Create Business profile
      await apiClient('/api/businesses', {
        token,
        workspaceId,
        method: 'POST',
        body: JSON.stringify({
          name: formData.businessName,
          websiteUrl: formattedUrl,
          industry: effectiveIndustry,
          city: formData.city,
          country: formData.country,
          serviceArea: formData.serviceArea || formData.city,
          primaryGoal: formData.primaryGoal,
          locations: [
            {
              name: `${formData.city} Primary Location`,
              city: formData.city,
              country: formData.country,
            },
          ],
          services: servicesList,
        }),
      });

      // Redirect to the overview dashboard
      router.push('/app');
    } catch (err: any) {
      console.error('Onboarding submission failed:', err);
      setError(err.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] py-8 sm:py-12 px-4 overflow-hidden flex flex-col justify-center">
      {/* ── BACKGROUND MOTION VISUALS ── */}
      {/* 1. Subtle SVG Dot Grid Matrix */}
      <div className="absolute inset-0 -z-30 opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,#000_60%,transparent_100%)]">
        <svg className="w-full h-full" width="100%" height="100%">
          <defs>
            <pattern id="onboarding-grid-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#6366f1" opacity="0.35" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#onboarding-grid-dots)" />
        </svg>
      </div>

      {/* 2. Dynamic Floating Radial Gradient Orbs */}
      <div className="absolute top-6 left-1/4 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-500/25 via-cyan-400/20 to-transparent rounded-full blur-3xl pointer-events-none -z-20 animate-orb-1" />
      <div className="absolute bottom-6 right-1/4 translate-x-1/2 w-[480px] h-[480px] bg-gradient-to-bl from-cyan-500/20 via-emerald-400/15 to-indigo-500/15 rounded-full blur-3xl pointer-events-none -z-20 animate-orb-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-20 animate-pulse" />

      {/* 3. Animated High-Tech Radar Scanning Sweep Visual */}
      <div className="hidden lg:block absolute top-12 right-6 xl:right-20 w-72 h-72 -z-10 pointer-events-none opacity-45">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Outer Ring with Coordinate Ticks */}
          <div className="absolute inset-0 rounded-full border border-indigo-400/25 border-dashed animate-spin" style={{ animationDuration: '60s' }} />
          {/* Middle Concentric Ring */}
          <div className="absolute inset-8 rounded-full border border-cyan-400/30" />
          {/* Inner Target Core */}
          <div className="absolute inset-16 rounded-full border border-indigo-500/20 bg-indigo-950/5" />
          <div className="absolute inset-24 rounded-full border border-emerald-400/40" />
          {/* Rotating Radar Sweep Cone */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/30 via-transparent to-transparent animate-radar" />
          {/* Target Crosshairs */}
          <div className="absolute w-full h-[1px] bg-indigo-400/20" />
          <div className="absolute h-full w-[1px] bg-indigo-400/20" />
          {/* Pulsing Target Pings */}
          <div className="absolute top-10 left-14 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="absolute top-10 left-14 w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <div className="absolute bottom-14 right-16 w-2 h-2 rounded-full bg-cyan-400 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute bottom-14 right-16 w-2 h-2 rounded-full bg-cyan-500" />
        </div>
      </div>

      {/* 4. Left Moving SERP Intelligence Badge */}
      <div className="hidden xl:flex absolute top-36 left-6 2xl:left-14 p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-indigo-950/10 items-center gap-3.5 z-0 animate-float-1 max-w-[240px]">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Google Map 3-Pack</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Rank #1
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">+42% Local Inquiries</p>
        </div>
      </div>

      {/* 5. Left Lower Moving Competitor Displaced Badge */}
      <div className="hidden xl:flex absolute bottom-28 left-6 2xl:left-16 p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-indigo-950/10 items-center gap-3.5 z-0 animate-float-2 max-w-[240px]">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Rival Displaced</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              +5 Pos
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Capturing appointments</p>
        </div>
      </div>

      {/* 6. Right Lower Moving Radar Status Badge */}
      <div className="hidden xl:flex absolute bottom-28 right-6 2xl:right-20 p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-indigo-950/10 items-center gap-3.5 z-0 animate-float-1 max-w-[240px]" style={{ animationDelay: '2s' }}>
        <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Autonomous Radar</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Evidence Grounded</p>
        </div>
      </div>

      {/* ── CARD CONTENT ── */}
      <div className="max-w-2xl w-full mx-auto relative z-10">
        {/* Progress Bar Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Step {step} of 3
            </span>
            <span className="font-bold text-slate-700">
              {step === 1 && 'Business Identity'}
              {step === 2 && 'Location & Services'}
              {step === 3 && 'Goals & Alignment'}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-500 transition-all duration-500 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xl shadow-indigo-950/5">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">What is your business?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  We will discover your competitors and audit your search visibility automatically.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="e.g. Apex Dental Studio"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Website URL *
                </label>
                <input
                  type="text"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={handleInputChange}
                  placeholder="e.g. https://apexdental.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Primary Industry
                </label>
                <select
                  name="industry"
                  value={selectedIndustry}
                  onChange={handleIndustryChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>

                {selectedIndustry === 'Other' && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Specify Your Industry *
                    </label>
                    <input
                      type="text"
                      value={customIndustry}
                      onChange={handleCustomIndustryChange}
                      placeholder="e.g. Accounting, Solar Roofing, Pet Grooming, Architecture..."
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                      autoFocus
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Serp-Scout will tailor competitor research, local keywords, and content gaps to this specific niche.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition"
                >
                  Continue to Location →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Where do you operate?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Local search rankings and competitor discovery depend on your target city.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    City / Metro Area *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g. Austin, TX or Koramangala"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="e.g. United States or India"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Primary Services (Comma-separated)
                </label>
                <input
                  type="text"
                  name="servicesInput"
                  value={formData.servicesInput}
                  onChange={handleInputChange}
                  placeholder="e.g. Teeth Whitening, Dental Implants, Emergency Dentist"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Our website analyzer will also extract additional services automatically.
                </p>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition"
                >
                  Continue to Goals →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">What is your primary goal?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Serp-Scout tailors your weekly 3 SEO actions toward real business outcomes.
                </p>
              </div>

              <div className="space-y-2.5">
                {PRIMARY_GOALS.map((goal) => (
                  <label
                    key={goal}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      formData.primaryGoal === goal
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="primaryGoal"
                      value={goal}
                      checked={formData.primaryGoal === goal}
                      onChange={handleInputChange}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">{goal}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
                  disabled={loading}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Setting up your workspace...
                    </>
                  ) : (
                    'Complete Setup & Launch 🚀'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  </div>
);
}
