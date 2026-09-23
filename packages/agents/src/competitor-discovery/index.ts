import { CompetitorCandidate, CompetitorExtractedProfile } from '@serp-scout/types';
import {
  extractCompetitorCandidates,
  RawSearchItemWithContext,
} from './candidate-extractor.js';
import {
  classifyCompetitorCandidate,
  ClassifierBusinessContext,
} from './classifier.js';
import { computeCompetitorConfidenceScore } from './scorer.js';
import { evaluateProximity, Coordinates } from './proximity.js';
import { profileCompetitorWebsite } from './profiler.js';
import { evaluateCompetitorThreat } from './threat-matrix.js';

export * from './query-planner.js';
export * from './candidate-extractor.js';
export * from './classifier.js';
export * from './scorer.js';
export * from './proximity.js';
export * from './profiler.js';
export * from './threat-matrix.js';

export interface DiscoverCompetitorsOptions {
  business: {
    name: string;
    websiteUrl: string;
    category?: string;
    services: string[];
    city: string;
    coordinates?: Coordinates | null;
  };
  searchItems: RawSearchItemWithContext[];
  maxCandidatesToEnrich?: number;
  maxCandidatesToProfile?: number;
  apiKey?: string;
}

export async function discoverCompetitors(
  options: DiscoverCompetitorsOptions
): Promise<CompetitorCandidate[]> {
  const {
    business,
    searchItems,
    maxCandidatesToEnrich = 15,
    maxCandidatesToProfile = 6,
    apiKey,
  } = options;

  // 1. Extract candidates from search results
  const extracted = extractCompetitorCandidates(searchItems, business.websiteUrl);

  const context: ClassifierBusinessContext = {
    businessName: business.name,
    category: business.category || business.services[0] || 'Local Business',
    services: business.services,
    city: business.city,
  };

  // Compute total unique queries in searchItems for overlap calculation
  const totalUniqueQueries = new Set(searchItems.map((s) => s.query.trim().toLowerCase())).size || 1;

  // 2. Classify and score candidates
  const preliminaryCandidates: Array<CompetitorCandidate & {
    latitude?: number;
    longitude?: number;
    address?: string;
  }> = [];

  // Enrich top candidates, for rest use fast classification
  for (let i = 0; i < extracted.length; i++) {
    const item = extracted[i];
    const shouldRunAi = i < maxCandidatesToEnrich;

    let competitorType: import('@serp-scout/types').CompetitorType = 'search';
    if (shouldRunAi) {
      const classified = await classifyCompetitorCandidate(item, context, apiKey);
      competitorType = classified.competitorType;
    } else {
      competitorType = 'search';
    }

    const confidenceScore = computeCompetitorConfidenceScore(item, competitorType, {
      services: business.services,
      city: business.city,
      category: context.category,
    });

    const proximity = evaluateProximity(
      business.coordinates,
      item.latitude && item.longitude ? { latitude: item.latitude, longitude: item.longitude } : null,
      business.city,
      item.address
    );

    const overlapPercent = Math.min(
      100,
      Math.round((item.queriesAppearedIn.length / totalUniqueQueries) * 100)
    );

    preliminaryCandidates.push({
      domain: item.domain,
      name: item.name,
      websiteUrl: item.websiteUrl,
      mapsUrl: item.mapsUrl,
      category: item.category,
      competitorType,
      confidenceScore,
      rating: item.rating,
      reviewCount: item.reviewsCount,
      hasAds: item.hasAds,
      distanceMiles: proximity.distanceMiles,
      proximityLabel: proximity.label,
      serpOverlapPercent: overlapPercent,
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address,
      evidence: item.queriesAppearedIn.map((q) => ({
        query: q,
        position: item.bestRank,
        source: item.mapsUrl ? 'google_maps' : 'google',
        locationMatch: business.city,
        serviceOverlap: business.services.filter((s) =>
          item.observedSnippets.join(' ').toLowerCase().includes(s.toLowerCase())
        ),
      })),
    });
  }

  // Sort by confidenceScore descending
  preliminaryCandidates.sort((a, b) => b.confidenceScore - a.confidenceScore);

  // 3. Automated Competitor Homepage Scraping (Top direct/geographic candidates)
  const profilePromises: Array<Promise<{ domain: string; profile: CompetitorExtractedProfile }>> = [];
  const candidatesToProfile = preliminaryCandidates
    .filter((c) => c.competitorType !== 'irrelevant' && c.competitorType !== 'directory')
    .slice(0, maxCandidatesToProfile);

  for (const cand of candidatesToProfile) {
    if (cand.websiteUrl && cand.websiteUrl.startsWith('http')) {
      profilePromises.push(
        profileCompetitorWebsite(cand.websiteUrl).then((profile) => ({
          domain: cand.domain,
          profile,
        }))
      );
    }
  }

  const profileResults = await Promise.allSettled(profilePromises);
  const profileMap = new Map<string, CompetitorExtractedProfile>();
  for (const res of profileResults) {
    if (res.status === 'fulfilled') {
      profileMap.set(res.value.domain, res.value.profile);
    }
  }

  // 4. Assign extractedProfile and compute Threat Matrix for every candidate
  const candidates: CompetitorCandidate[] = preliminaryCandidates.map((cand) => {
    const extractedProfile = profileMap.get(cand.domain);
    const hasOnlineBooking = extractedProfile?.hasOnlineBooking || false;

    const threat = evaluateCompetitorThreat({
      bestRank: cand.evidence[0]?.position || 10,
      rating: cand.rating,
      reviewCount: cand.reviewCount,
      isHyperLocal: cand.proximityLabel?.includes('Hyper-Local') || false,
      distanceMiles: cand.distanceMiles,
      hasAds: cand.hasAds,
      hasOnlineBooking,
      serpOverlapPercent: cand.serpOverlapPercent,
      queriesAppearedCount: cand.evidence.length,
    });

    return {
      domain: cand.domain,
      name: cand.name,
      websiteUrl: cand.websiteUrl,
      mapsUrl: cand.mapsUrl,
      category: cand.category,
      competitorType: cand.competitorType,
      confidenceScore: cand.confidenceScore,
      rating: cand.rating,
      reviewCount: cand.reviewCount,
      threatLevel: threat.threatLevel,
      threatReason: threat.threatReason,
      distanceMiles: cand.distanceMiles,
      proximityLabel: cand.proximityLabel,
      hasAds: cand.hasAds,
      serpOverlapPercent: cand.serpOverlapPercent,
      extractedProfile,
      evidence: cand.evidence,
    };
  });

  return candidates;
}
