import { CompetitorCandidate } from '@serp-scout/types';
import {
  extractCompetitorCandidates,
  RawSearchItemWithContext,
} from './candidate-extractor.js';
import {
  classifyCompetitorCandidate,
  ClassifierBusinessContext,
} from './classifier.js';
import { computeCompetitorConfidenceScore } from './scorer.js';

export * from './query-planner.js';
export * from './candidate-extractor.js';
export * from './classifier.js';
export * from './scorer.js';

export interface DiscoverCompetitorsOptions {
  business: {
    name: string;
    websiteUrl: string;
    category?: string;
    services: string[];
    city: string;
  };
  searchItems: RawSearchItemWithContext[];
  maxCandidatesToEnrich?: number;
  apiKey?: string;
}

export async function discoverCompetitors(
  options: DiscoverCompetitorsOptions
): Promise<CompetitorCandidate[]> {
  const { business, searchItems, maxCandidatesToEnrich = 15, apiKey } = options;

  // 1. Extract candidates from search results
  const extracted = extractCompetitorCandidates(searchItems, business.websiteUrl);

  const context: ClassifierBusinessContext = {
    businessName: business.name,
    category: business.category || business.services[0] || 'Local Business',
    services: business.services,
    city: business.city,
  };

  // 2. Classify and score candidates
  const candidates: CompetitorCandidate[] = [];

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

    candidates.push({
      domain: item.domain,
      name: item.name,
      websiteUrl: item.websiteUrl,
      mapsUrl: item.mapsUrl,
      category: item.category,
      competitorType,
      confidenceScore,
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
  return candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
