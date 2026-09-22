import { KeywordCandidate, SearchIntent } from '@serp-scout/types';
import {
  generateKeywordCandidates,
  CandidateGeneratorInput,
} from './candidate-generator.js';
import {
  classifyKeywordIntent,
  BusinessIntentContext,
} from './intent-classifier.js';
import {
  computeOpportunityScore,
} from './opportunity-scorer.js';

export * from './candidate-generator.js';
export * from './intent-classifier.js';
export * from './opportunity-scorer.js';

export interface DiscoverKeywordsOptions {
  business: {
    name: string;
    category?: string;
    services: string[];
    city?: string;
  };
  websiteKeywords?: string[];
  serpTitles?: string[];
  paaQuestions?: string[];
  userSeedKeywords?: string[];
  maxAiEnrichments?: number;
  apiKey?: string;
}

export async function discoverKeywords(
  options: DiscoverKeywordsOptions
): Promise<KeywordCandidate[]> {
  const {
    business,
    websiteKeywords = [],
    serpTitles = [],
    paaQuestions = [],
    userSeedKeywords = [],
    maxAiEnrichments = 15,
    apiKey,
  } = options;

  // 1. Generate candidate phrases
  const phrases = generateKeywordCandidates({
    businessName: business.name,
    category: business.category,
    services: business.services,
    city: business.city,
    websiteKeywords,
    serpTitles,
    paaQuestions,
    userSeedKeywords,
  });

  const context: BusinessIntentContext = {
    businessName: business.name,
    category: business.category || business.services[0] || 'Local Business',
    services: business.services,
    city: business.city,
  };

  const results: KeywordCandidate[] = [];

  // 2. Classify and score each candidate
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const runAi = i < maxAiEnrichments;

    // AI or heuristic classification
    let intent: SearchIntent = 'commercial';
    let relevance = 75;
    let commercial = 70;
    let localFit = business.city && phrase.includes(business.city.toLowerCase()) ? 90 : 60;
    let reasoning = 'Generated search keyword candidate.';

    if (runAi) {
      try {
        const intentResult = await classifyKeywordIntent(phrase, context, apiKey);
        intent = intentResult.intent;
        relevance = intentResult.businessRelevance;
        commercial = intentResult.commercialScore;
        localFit = intentResult.localFit;
        reasoning = intentResult.reasoning;
      } catch (err) {
        console.warn(`Failed AI classification for keyword "${phrase}":`, err);
      }
    } else {
      // Heuristic fallback for rest
      if (phrase.includes('near me') || (business.city && phrase.includes(business.city.toLowerCase()))) {
        intent = 'local';
        localFit = 90;
      } else if (phrase.includes('how') || phrase.includes('what')) {
        intent = 'informational';
        commercial = 35;
      } else if (phrase.includes('emergency') || phrase.includes('repair')) {
        intent = 'problem-based';
        commercial = 85;
      }
    }

    // Compute opportunity score
    const opportunity = computeOpportunityScore({
      businessRelevance: relevance,
      commercialIntent: commercial,
      localFit,
    });

    results.push({
      phrase,
      intent,
      opportunityScore: opportunity.score,
      relevanceScore: relevance,
      commercialScore: commercial,
      reasoning: reasoning || opportunity.reasoning,
    });
  }

  // Sort descending by opportunity score
  return results.sort((a, b) => b.opportunityScore - a.opportunityScore);
}
