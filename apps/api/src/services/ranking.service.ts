import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import {
  db,
  businesses,
  competitors,
  keywords,
  searchRuns,
  searchResults,
  rankingObservations,
} from '../db/index.js';
import { executeSearchRun } from './search-run.service.js';

export interface KeywordRankingDetail {
  keyword: {
    id: string;
    phrase: string;
    location: string | null;
    intent: string | null;
    status: string;
    opportunityScore: number;
    createdAt: Date;
  };
  currentRank: number | null;
  previousRank: number | null;
  delta: number | null;
  resultType: string | null;
  url: string | null;
  serpFeatures: string[] | null;
  lastObservedAt: Date | null;
  bestCompetitorRank: number | null;
  bestCompetitorDomain: string | null;
}

export function extractDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.replace(/^www\./, '').toLowerCase();
  }
}

/**
 * Records ranking observations for a keyword from a search run's results
 */
export async function recordRankingObservations(params: {
  businessId: string;
  keywordId: string;
  searchRunId?: string | null;
  results: {
    rank: number;
    url: string;
    domain: string;
    resultType?: string;
    serpFeatures?: string[];
  }[];
}) {
  const { businessId, keywordId, searchRunId, results } = params;

  // 1. Fetch business and its confirmed competitors
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) return [];

  const userDomain = extractDomainFromUrl(biz.websiteUrl);

  const compList = await db
    .select()
    .from(competitors)
    .where(eq(competitors.businessId, businessId));

  const competitorDomains = new Set(compList.map((c) => c.domain.toLowerCase()));

  // 2. Identify observations for user business and competitors
  const recorded = [];

  for (const item of results) {
    const itemDomain = item.domain.toLowerCase();
    const isUserDomain = itemDomain.includes(userDomain) || userDomain.includes(itemDomain);
    const isCompetitor = competitorDomains.has(itemDomain);

    if (isUserDomain || isCompetitor) {
      // Find prior observation to track delta
      const [previous] = await db
        .select()
        .from(rankingObservations)
        .where(
          and(
            eq(rankingObservations.keywordId, keywordId),
            eq(rankingObservations.domain, itemDomain)
          )
        )
        .orderBy(desc(rankingObservations.observedAt))
        .limit(1);

      const [obs] = await db
        .insert(rankingObservations)
        .values({
          businessId,
          keywordId,
          domain: itemDomain,
          url: item.url,
          rank: item.rank,
          resultType: item.resultType || 'organic',
          serpFeatures: item.serpFeatures ? item.serpFeatures : [],
          searchRunId: searchRunId || null,
        })
        .returning();

      const delta = previous ? previous.rank - item.rank : null; // positive = improvement (e.g. 5 -> 3 = +2)

      recorded.push({
        observation: obs,
        previousRank: previous?.rank ?? null,
        delta,
        isUserDomain,
      });
    }
  }

  return recorded;
}

/**
 * Retrieves all keywords for a business with their latest ranking status & deltas
 */
export async function getRankingsForBusiness(
  businessId: string,
  statusFilter?: string
): Promise<KeywordRankingDetail[]> {
  const conditions = [eq(keywords.businessId, businessId)];
  if (statusFilter) {
    conditions.push(eq(keywords.status, statusFilter));
  }

  const keywordList = await db
    .select()
    .from(keywords)
    .where(and(...conditions))
    .orderBy(desc(keywords.opportunityScore));

  if (keywordList.length === 0) {
    return [];
  }

  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const userDomain = biz ? extractDomainFromUrl(biz.websiteUrl) : '';

  const compList = await db
    .select()
    .from(competitors)
    .where(eq(competitors.businessId, businessId));
  const competitorDomains = new Set(compList.map((c) => c.domain.toLowerCase()));

  const keywordIds = keywordList.map((k) => k.id);

  // Fetch all recent observations for these keywords
  const allObservations = await db
    .select()
    .from(rankingObservations)
    .where(inArray(rankingObservations.keywordId, keywordIds))
    .orderBy(desc(rankingObservations.observedAt));

  const result: KeywordRankingDetail[] = [];

  for (const kw of keywordList) {
    const kwObs = allObservations.filter((o) => o.keywordId === kw.id);

    // Find observations for user's domain
    const userObsList = kwObs.filter(
      (o) => o.domain.toLowerCase().includes(userDomain) || userDomain.includes(o.domain.toLowerCase())
    );

    const latestUserObs = userObsList[0] || null;
    const previousUserObs = userObsList[1] || null;

    const delta =
      latestUserObs && previousUserObs
        ? previousUserObs.rank - latestUserObs.rank
        : null;

    // Find best competitor observation
    const competitorObs = kwObs
      .filter((o) => competitorDomains.has(o.domain.toLowerCase()))
      .sort((a, b) => a.rank - b.rank);

    const bestComp = competitorObs[0] || null;

    result.push({
      keyword: {
        id: kw.id,
        phrase: kw.phrase,
        location: kw.location,
        intent: kw.intent,
        status: kw.status,
        opportunityScore: kw.opportunityScore,
        createdAt: kw.createdAt,
      },
      currentRank: latestUserObs ? latestUserObs.rank : null,
      previousRank: previousUserObs ? previousUserObs.rank : null,
      delta,
      resultType: latestUserObs ? latestUserObs.resultType : null,
      url: latestUserObs ? latestUserObs.url : null,
      serpFeatures: (latestUserObs?.serpFeatures as string[]) || null,
      lastObservedAt: latestUserObs ? latestUserObs.observedAt : null,
      bestCompetitorRank: bestComp ? bestComp.rank : null,
      bestCompetitorDomain: bestComp ? bestComp.domain : null,
    });
  }

  return result;
}

/**
 * Refreshes ranking observations for all tracking or approved keywords
 */
export async function refreshKeywordRankings(params: {
  businessId: string;
  workspaceId: string;
  searchType?: 'google' | 'google_maps';
}): Promise<{
  refreshedCount: number;
  details: KeywordRankingDetail[];
}> {
  const { businessId, workspaceId, searchType = 'google' } = params;

  // 1. Get all keywords marked 'tracking' or 'approved'
  const activeKeywords = await db
    .select()
    .from(keywords)
    .where(
      and(
        eq(keywords.businessId, businessId),
        inArray(keywords.status, ['tracking', 'approved', 'candidate'])
      )
    )
    .limit(10); // cap per refresh to respect quotas

  let refreshedCount = 0;

  for (const kw of activeKeywords) {
    try {
      const runResult = await executeSearchRun({
        businessId,
        workspaceId,
        searchType,
        query: kw.phrase,
        location: kw.location || undefined,
        num: 20,
      });

      // Fetch search results saved in database
      const dbResults = await db
        .select()
        .from(searchResults)
        .where(eq(searchResults.searchRunId, runResult.run.id));

      await recordRankingObservations({
        businessId,
        keywordId: kw.id,
        searchRunId: runResult.run.id,
        results: dbResults.map((r) => ({
          rank: r.rank,
          url: r.url,
          domain: r.domain,
          resultType: r.resultType,
        })),
      });

      refreshedCount++;
    } catch (err) {
      console.warn(`Failed to refresh ranking for keyword "${kw.phrase}":`, err);
    }
  }

  const updatedDetails = await getRankingsForBusiness(businessId);

  return {
    refreshedCount,
    details: updatedDetails,
  };
}
