import { CompetitorType } from '@serp-scout/types';
import { ExtractedCandidateDomain } from './candidate-extractor.js';

export interface ScorerContext {
  services: string[];
  city: string;
  category: string;
}

export function computeCompetitorConfidenceScore(
  candidate: ExtractedCandidateDomain,
  competitorType: CompetitorType,
  context: ScorerContext
): number {
  // If directory, publisher, or irrelevant, keep confidence very low so they don't pollute top direct competitors
  if (competitorType === 'directory') return 15.0;
  if (competitorType === 'publisher') return 10.0;
  if (competitorType === 'irrelevant') return 0.0;

  let totalScore = 0;

  // 1. Service similarity (30%)
  let serviceScore = 0;
  const searchableText = `${candidate.name} ${candidate.category || ''} ${candidate.observedSnippets.join(' ')}`.toLowerCase();
  let matchedServices = 0;

  for (const svc of context.services) {
    if (searchableText.includes(svc.toLowerCase())) {
      matchedServices++;
    }
  }

  if (context.services.length > 0) {
    const ratio = matchedServices / context.services.length;
    serviceScore = Math.min(30, Math.round(ratio * 30 + (matchedServices > 0 ? 10 : 0)));
  } else {
    serviceScore = 15;
  }
  totalScore += serviceScore;

  // 2. Location overlap (25%)
  let locationScore = 0;
  const cityLower = context.city.toLowerCase();
  const addressLower = (candidate.address || '').toLowerCase();
  const hasCityInAddress = addressLower.includes(cityLower);
  const hasCityInQuery = candidate.queriesAppearedIn.some((q) => q.toLowerCase().includes(cityLower));

  if (hasCityInAddress) {
    locationScore = 25;
  } else if (hasCityInQuery && candidate.mapsUrl) {
    locationScore = 20;
  } else if (hasCityInQuery) {
    locationScore = 15;
  } else {
    locationScore = 5;
  }
  totalScore += locationScore;

  // 3. Repeated SERP appearances (20%)
  let appearanceScore = 0;
  if (candidate.appearancesCount >= 4) {
    appearanceScore = 20;
  } else if (candidate.appearancesCount === 3) {
    appearanceScore = 16;
  } else if (candidate.appearancesCount === 2) {
    appearanceScore = 12;
  } else {
    // 1 appearance, but rank matters
    appearanceScore = candidate.bestRank <= 3 ? 8 : 4;
  }
  totalScore += appearanceScore;

  // 4. Intent overlap (15%)
  let intentScore = 0;
  switch (competitorType) {
    case 'direct':
      intentScore = 15;
      break;
    case 'geographic':
      intentScore = 12;
      break;
    case 'search':
      intentScore = 10;
      break;
    case 'indirect':
      intentScore = 6;
      break;
    default:
      intentScore = 2;
  }
  totalScore += intentScore;

  // 5. Business-type similarity (10%)
  let businessTypeScore = 0;
  switch (competitorType) {
    case 'direct':
      businessTypeScore = 10;
      break;
    case 'geographic':
      businessTypeScore = 9;
      break;
    case 'search':
      businessTypeScore = 6;
      break;
    case 'indirect':
      businessTypeScore = 4;
      break;
    default:
      businessTypeScore = 1;
  }
  totalScore += businessTypeScore;

  return Math.min(100, Math.max(0, totalScore));
}
