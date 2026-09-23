import { NormalizedSearchResult, NormalizedMapsResult, NormalizedNewsResult } from './serpapi.js';

export interface WebsiteAnalysis {
  url: string;
  businessName?: string;
  detectedCategory?: string;
  detectedServices: string[];
  detectedLocations: string[];
  metaTitle?: string;
  metaDescription?: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  callsToAction: string[];
  contactDetails: {
    phone?: string;
    email?: string;
    address?: string;
    bookingUrl?: string;
  };
  missingOpportunities: {
    servicePages: string[];
    locationPages: string[];
  };
  candidateKeywords: string[];
  candidateCompetitorQueries: string[];
}

export type CompetitorType =
  | 'direct'
  | 'geographic'
  | 'search'
  | 'indirect'
  | 'directory'
  | 'publisher'
  | 'irrelevant';

export type ThreatLevel = 'severe' | 'vulnerable' | 'emerging' | 'moderate';

export interface CompetitorExtractedProfile {
  bookingTech?: string[];
  offers?: string[];
  callsToAction?: string[];
  phone?: string;
  hasOnlineBooking?: boolean;
}

export interface CompetitorCandidate {
  domain: string;
  name: string;
  websiteUrl: string;
  mapsUrl?: string;
  category?: string;
  competitorType: CompetitorType;
  confidenceScore: number;
  evidence: {
    query: string;
    position: number;
    source: 'google' | 'google_maps';
    locationMatch?: string;
    serviceOverlap?: string[];
  }[];
  threatLevel?: ThreatLevel;
  threatReason?: string;
  distanceMiles?: number;
  proximityLabel?: string;
  hasAds?: boolean;
  serpOverlapPercent?: number;
  extractedProfile?: CompetitorExtractedProfile;
  rating?: number;
  reviewCount?: number;
}

export type SearchIntent =
  | 'informational'
  | 'commercial'
  | 'transactional'
  | 'local'
  | 'navigational'
  | 'comparison'
  | 'problem-based';

export interface KeywordCandidate {
  phrase: string;
  intent: SearchIntent;
  opportunityScore: number;
  relevanceScore: number;
  commercialScore: number;
  currentRank?: number;
  bestCompetitorRank?: number;
  serpFeatures?: string[];
  reasoning?: string;
}

export interface ContentGap {
  topic: string;
  competitorDomain: string;
  competitorUrl: string;
  recommendedPageType: 'service' | 'location' | 'faq' | 'comparison' | 'guide';
  suggestedTitle: string;
  suggestedHeadings: string[];
  suggestedFaqs: string[];
  targetIntent: SearchIntent;
  estimatedImpact: 'high' | 'medium' | 'low';
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  evidenceUrls: string[];
}

export interface MessagingPattern {
  headline: string;
  primaryOffer: string;
  differentiator: string;
  priceLanguage?: string;
  guarantees?: string;
  speedOfService?: string;
  cta: string;
  trustSignals: string[];
  observedPatterns: string[];
}

export interface ReviewTheme {
  theme: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  frequency: number;
  examples: string[];
  sourceUrl?: string;
  suggestedCopyOpportunity?: string;
}

export interface NewsSignal {
  headline: string;
  source: string;
  date?: string;
  category:
    | 'opportunity'
    | 'competitive_activity'
    | 'market_trend'
    | 'reputation_risk'
    | 'regulatory'
    | 'low_relevance';
  summary: string;
  url: string;
}

export interface Recommendation {
  title: string;
  problem: string;
  evidenceSummary: string;
  sourceUrls: string[];
  searchQueries: string[];
  expectedImpact: 'high' | 'medium' | 'low';
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  confidence: 'high' | 'medium' | 'low';
  suggestedOwner?: string;
  suggestedDeadline?: string;
  implementationSteps?: string[];
}

export interface ReportShare {
  id: string;
  reportId: string;
  businessId: string;
  shareToken: string;
  viewMode: 'executive' | 'specialist';
  expiresAt?: string | null;
  createdAt: string;
}

export interface MarketAlert {
  id: string;
  businessId: string;
  type: '3pack_displacement' | 'review_spike' | 'competitor_ads' | 'critical_rank_drop';
  severity: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  details?: Record<string, any>;
  dismissed: boolean;
  detectedAt: string;
}

export interface GeneratedReport {
  executiveSummary: {
    importantChanges: string;
    mainOpportunity: string;
    mainCompetitiveThreat: string;
    weeklyFocus: string;
  };
  visibilityChanges: {
    keywordChanges: Array<{ keyword: string; oldRank?: number; newRank?: number }>;
    mapsChanges: Array<{ business: string; change: string }>;
    serpFeatureChanges: string[];
  };
  competitorChanges: string[];
  contentOpportunities: ContentGap[];
  actionPlan: Recommendation[]; // max 3 to 5
  evidenceAppendix: Array<{
    query: string;
    source: string;
    date: string;
    resultType: string;
    url?: string;
  }>;
}
