export interface OpportunityScorerInput {
  businessRelevance: number; // 0 - 100
  commercialIntent: number;  // 0 - 100
  localFit: number;          // 0 - 100
  currentRank?: number;
  bestCompetitorRank?: number;
}

export interface OpportunityScoreResult {
  score: number; // 0 - 100
  breakdown: {
    relevanceWeight: number;    // 30%
    commercialWeight: number;   // 25%
    rankingPotentialWeight: number; // 20%
    localFitWeight: number;     // 15%
    contentGapWeight: number;   // 10%
  };
  rankingPotential: number; // 0 - 100
  contentGap: number;       // 0 - 100
  reasoning: string;
}

/**
 * Calculates keyword opportunity score per Plan.md §5.4:
 * 30% business relevance + 25% commercial intent + 20% ranking potential + 15% local fit + 10% content gap
 */
export function computeOpportunityScore(input: OpportunityScorerInput): OpportunityScoreResult {
  const relevance = Math.min(100, Math.max(0, input.businessRelevance));
  const commercial = Math.min(100, Math.max(0, input.commercialIntent));
  const local = Math.min(100, Math.max(0, input.localFit));

  // 1. Ranking Potential (20%)
  // High potential if in "striking distance" (ranks 4-20) where small SEO improvements yield dramatic traffic
  let rankingPotential = 60;
  if (input.currentRank !== undefined && input.currentRank > 0) {
    if (input.currentRank >= 4 && input.currentRank <= 10) {
      rankingPotential = 95; // Striking distance (top of page 1)
    } else if (input.currentRank >= 11 && input.currentRank <= 20) {
      rankingPotential = 85; // Page 2 opportunity
    } else if (input.currentRank >= 21 && input.currentRank <= 50) {
      rankingPotential = 70;
    } else if (input.currentRank <= 3) {
      rankingPotential = 50; // Already in top 3 - lower marginal gain
    } else {
      rankingPotential = 55;
    }
  }

  // 2. Content Gap (10%)
  // High if a direct competitor holds a top ranking but the business does not
  let contentGap = 50;
  if (input.bestCompetitorRank !== undefined && input.bestCompetitorRank > 0) {
    if (!input.currentRank || input.currentRank > 20) {
      if (input.bestCompetitorRank <= 5) {
        contentGap = 95; // Competitor dominates top 5 while business is unranked
      } else if (input.bestCompetitorRank <= 10) {
        contentGap = 85;
      }
    } else if (input.currentRank > input.bestCompetitorRank) {
      contentGap = Math.min(90, 50 + (input.currentRank - input.bestCompetitorRank) * 4);
    } else {
      contentGap = 35; // Business is outranking competitors
    }
  }

  // 3. Weighted Formula (Plan.md §5.4)
  const relevanceWeight = relevance * 0.30;
  const commercialWeight = commercial * 0.25;
  const rankingPotentialWeight = rankingPotential * 0.20;
  const localFitWeight = local * 0.15;
  const contentGapWeight = contentGap * 0.10;

  const totalScore = Math.round(
    relevanceWeight +
    commercialWeight +
    rankingPotentialWeight +
    localFitWeight +
    contentGapWeight
  );

  const boundedScore = Math.min(100, Math.max(0, totalScore));

  let reasoning = '';
  if (boundedScore >= 80) {
    reasoning = 'High-priority keyword: strong commercial intent, high relevance, and clear ranking upside.';
  } else if (boundedScore >= 60) {
    reasoning = 'Moderate opportunity: solid alignment with services and steady conversion potential.';
  } else {
    reasoning = 'Lower priority: broader or informational query with indirect business impact.';
  }

  return {
    score: boundedScore,
    breakdown: {
      relevanceWeight: Math.round(relevanceWeight * 10) / 10,
      commercialWeight: Math.round(commercialWeight * 10) / 10,
      rankingPotentialWeight: Math.round(rankingPotentialWeight * 10) / 10,
      localFitWeight: Math.round(localFitWeight * 10) / 10,
      contentGapWeight: Math.round(contentGapWeight * 10) / 10,
    },
    rankingPotential,
    contentGap,
    reasoning,
  };
}
