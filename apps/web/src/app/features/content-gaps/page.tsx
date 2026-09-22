'use client';

import React from 'react';
import Link from 'next/link';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import {
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Layers,
  Search,
  Lock,
} from 'lucide-react';

export default function ContentGapsFeaturePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 -z-30 opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_75%_65%_at_50%_40%,#000_50%,transparent_100%)]">
          <svg className="w-full h-full" width="100%" height="100%">
            <defs>
              <pattern id="content-grid-dots" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.3" fill="#6366f1" opacity="0.35" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#content-grid-dots)" />
          </svg>
        </div>

        <div className="absolute -top-16 left-10 w-[420px] h-[420px] bg-gradient-to-tr from-indigo-400/25 via-cyan-300/20 to-transparent rounded-full blur-3xl pointer-events-none -z-20 animate-orb-1" />
        <div className="absolute top-16 right-10 w-[460px] h-[460px] bg-gradient-to-bl from-cyan-400/25 via-emerald-300/15 to-indigo-300/15 rounded-full blur-3xl pointer-events-none -z-20 animate-orb-2" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs mb-6">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Core Feature &bull; Autonomous Content Gap Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] mb-6">
            Find the Exact Pages Your Rivals Have{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 bg-clip-text text-transparent">
              That You Are Missing
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-700 font-medium italic mb-4 max-w-2xl mx-auto">
            &ldquo;Success is measured by real business outcomes rather than an arbitrary visibility score.&rdquo;
          </p>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            If a rival dentist ranks #1 for &quot;Emergency Extractions,&quot; it&apos;s usually because they have a dedicated service page that your website lacks. Serp-Scout crawls rival sitemaps and pinpoints your missing high-converting pages.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up?redirect_url=/content"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-xl shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              <span>Audit Content Gaps</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/sign-in?redirect_url=/content"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-bold text-sm sm:text-base text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Sign In to Content Gaps</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Service-Area Page Audits</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Reveals the localized neighborhood and suburb pages your competitors built to dominate neighboring zip codes.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-200 text-xs font-bold text-indigo-600">
                Neighborhood Geo-Targeting
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-600 mb-4">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Missing Treatment &amp; FAQ Gaps</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Extracts the exact FAQs, pricing breakdowns, and insurance information competitors feature that Google uses to award rich snippets.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-200 text-xs font-bold text-cyan-600">
                Rich Snippet Qualification
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">AI Outline Generator</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Generates ready-to-publish content briefs grounded in real search results, complete with header structures and target local terms.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-200 text-xs font-bold text-emerald-600">
                Instant Publishing Briefs
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-slate-950 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold mb-4">Close Your Content Gaps Today</h2>
          <p className="text-slate-400 text-sm mb-8">
            See which high-converting landing pages your competitors are using to capture appointments.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up?redirect_url=/content"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-2"
            >
              <span>Get Started (Redirect to Content Gaps)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-in?redirect_url=/content"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Sign In to Account
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
