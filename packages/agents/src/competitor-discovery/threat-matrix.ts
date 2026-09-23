import { ThreatLevel } from '@serp-scout/types';

export interface ThreatEvaluationInput {
  bestRank: number;
  rating?: number;
  reviewCount?: number;
  isHyperLocal?: boolean;
  distanceMiles?: number;
  hasAds?: boolean;
  hasOnlineBooking?: boolean;
  serpOverlapPercent?: number;
  queriesAppearedCount?: number;
}

export interface ThreatEvaluationOutput {
  threatLevel: ThreatLevel;
  threatReason: string;
}

/**
 * Evaluates a competitor's multi-dimensional threat level based on ranking,
 * proximity, review reputation, paid ad activity, and conversion technology.
 */
export function evaluateCompetitorThreat(
  input: ThreatEvaluationInput
): ThreatEvaluationOutput {
  const {
    bestRank,
    rating,
    reviewCount = 0,
    isHyperLocal = false,
    distanceMiles,
    hasAds = false,
    hasOnlineBooking = false,
    serpOverlapPercent = 0,
  } = input;

  const isTopRanked = bestRank <= 3;
  const isHighRated = (rating ?? 0) >= 4.5;
  const isLowRated = (rating ?? 0) > 0 && (rating ?? 0) < 4.2;
  const hasHighReviews = reviewCount >= 40;

  // 1. SEVERE THREAT
  if (hasAds && (isTopRanked || isHyperLocal)) {
    return {
      threatLevel: 'severe',
      threatReason: `Aggressive rival running paid Google Ads${isHyperLocal ? ' in your immediate neighborhood' : ''} to siphon local search traffic.`,
    };
  }

  if (isHyperLocal && isHighRated && hasHighReviews) {
    const distText = distanceMiles ? ` (${distanceMiles} mi away)` : '';
    return {
      threatLevel: 'severe',
      threatReason: `Hyper-local power player${distText} with ${rating}★ across ${reviewCount}+ verified reviews dominating nearby patient/customer searches.`,
    };
  }

  if (isTopRanked && isHighRated && serpOverlapPercent >= 50) {
    return {
      threatLevel: 'severe',
      threatReason: `Dominates position #${bestRank} across ${serpOverlapPercent}% of targeted keywords with strong ${rating}★ reputation.`,
    };
  }

  // 2. VULNERABLE COMPETITOR (Target to outcompete)
  if (isTopRanked && (isLowRated || !hasOnlineBooking)) {
    if (isLowRated) {
      return {
        threatLevel: 'vulnerable',
        threatReason: `Ranks high at #${bestRank} but suffers from mediocre customer ratings (${rating}★) — prime target to displace with higher review volume.`,
      };
    }
    return {
      threatLevel: 'vulnerable',
      threatReason: `Holds top rank (#${bestRank}) but lacks online booking/conversion capabilities, leaking high-intent searchers.`,
    };
  }

  if (bestRank <= 7 && reviewCount < 15) {
    return {
      threatLevel: 'vulnerable',
      threatReason: `Visible in search results (#${bestRank}) but has an underdeveloped review profile (<15 reviews), making them easy to surpass.`,
    };
  }

  // 3. EMERGING RIVAL
  if (isHighRated && hasOnlineBooking && bestRank >= 4 && bestRank <= 12) {
    return {
      threatLevel: 'emerging',
      threatReason: `Strong operational setup (${rating}★, online booking) ranking on page 1-2 (#${bestRank}) — poised to overtake top 3 spots if unmonitored.`,
    };
  }

  if (serpOverlapPercent >= 40 && bestRank > 3) {
    return {
      threatLevel: 'emerging',
      threatReason: `Frequently appears across multiple local search queries (${serpOverlapPercent}% overlap) and actively building search visibility.`,
    };
  }

  // 4. MODERATE THREAT (Standard Organic Presence)
  let moderateReason = `Standard organic contender ranking at #${bestRank}.`;
  if (distanceMiles && distanceMiles > 10) {
    moderateReason = `Regional provider (${distanceMiles} mi) competing for broad service keywords but lacks hyper-local proximity advantage.`;
  }

  return {
    threatLevel: 'moderate',
    threatReason: moderateReason,
  };
}
