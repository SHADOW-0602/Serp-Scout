import { eq, desc, and, sql } from 'drizzle-orm';
import {
  db,
  workspaces,
  businesses,
  searchRuns,
  searchResults,
} from '../db/index.js';
import {
  searchGoogle,
  searchGoogleMaps,
  searchGoogleNews,
} from '@serp-scout/serpapi';
import { env } from '../config/env.js';

export interface ExecuteSearchOptions {
  businessId: string;
  workspaceId: string;
  searchType: 'google' | 'google_maps' | 'google_news';
  query: string;
  location?: string;
  language?: string;
  country?: string;
  device?: 'desktop' | 'mobile';
  num?: number;
}

export async function executeSearchRun(options: ExecuteSearchOptions) {
  const {
    businessId,
    workspaceId,
    searchType,
    query,
    location,
    language = 'en',
    country = 'us',
    device = 'desktop',
    num = 20,
  } = options;

  // 1. Verify workspace exists and check monthly quota
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  if (workspace.usedQuota >= workspace.monthlyQuota) {
    throw new Error(
      `Monthly search quota exceeded (${workspace.usedQuota}/${workspace.monthlyQuota} units used). Please upgrade or wait for the next billing cycle.`
    );
  }

  // 2. Verify business belongs to workspace
  const [business] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, businessId), eq(businesses.workspaceId, workspaceId)))
    .limit(1);

  if (!business) {
    throw new Error(`Business ${businessId} not found in workspace ${workspaceId}`);
  }

  // 3. Create search_runs record with status 'pending'
  const [run] = await db
    .insert(searchRuns)
    .values({
      businessId,
      provider: 'serpapi',
      searchType,
      query,
      location: location || business.city || undefined,
      language,
      device,
      costUnits: 1,
      status: 'pending',
    })
    .returning();

  try {
    let rawResults: any[] = [];
    const searchLocation = location || business.city || undefined;

    // 4. Dispatch search to SerpApi
    if (searchType === 'google') {
      const resp = await searchGoogle(
        { query, location: searchLocation, language, country, device, num },
        env.SERPAPI_KEY
      );
      rawResults = resp.results.map((r) => ({
        resultType: 'organic',
        rank: r.rank,
        title: r.title,
        url: r.url,
        domain: r.domain,
        businessName: r.title,
        snippet: r.snippet,
        serpFeatures: r.serpFeatures,
        rawReference: r.raw,
      }));
    } else if (searchType === 'google_maps') {
      const resp = await searchGoogleMaps(
        { query, location: searchLocation, language },
        env.SERPAPI_KEY
      );
      rawResults = resp.results.map((m) => ({
        resultType: 'maps',
        rank: m.rank,
        title: m.title,
        url: m.website || m.raw?.link || '',
        domain: m.website ? new URL(m.website).hostname.replace(/^www\./, '') : '',
        businessName: m.title,
        snippet: m.address,
        rating: m.rating ? String(m.rating) : undefined,
        reviewCount: m.reviewsCount,
        locationText: m.address,
        rawReference: m.raw,
      }));
    } else if (searchType === 'google_news') {
      const resp = await searchGoogleNews(
        { query, language, country },
        env.SERPAPI_KEY
      );
      rawResults = resp.results.map((n) => ({
        resultType: 'news',
        rank: n.rank,
        title: n.title,
        url: n.link,
        domain: n.source,
        businessName: n.source,
        snippet: n.snippet,
        rawReference: n.raw,
      }));
    }

    // 5. Persist normalized results
    if (rawResults.length > 0) {
      await db.insert(searchResults).values(
        rawResults.map((item) => ({
          searchRunId: run.id,
          resultType: item.resultType || searchType,
          rank: item.rank,
          title: item.title,
          url: item.url,
          domain: item.domain || 'unknown',
          businessName: item.businessName,
          snippet: item.snippet,
          rating: item.rating ? String(item.rating) : undefined,
          reviewCount: item.reviewCount,
          locationText: item.locationText,
          rawReference: item.rawReference,
        }))
      );
    }

    // 6. Update search run status to 'completed'
    const [completedRun] = await db
      .update(searchRuns)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(searchRuns.id, run.id))
      .returning();

    // 7. Increment workspace quota count atomically
    await db
      .update(workspaces)
      .set({
        usedQuota: sql`${workspaces.usedQuota} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId));

    return {
      run: completedRun,
      resultsCount: rawResults.length,
      results: rawResults,
    };
  } catch (err: any) {
    // On failure, preserve the search_run row with error message
    await db
      .update(searchRuns)
      .set({
        status: 'failed',
        errorMessage: err.message,
        completedAt: new Date(),
      })
      .where(eq(searchRuns.id, run.id));

    throw err;
  }
}

export async function listSearchRunsForBusiness(businessId: string, limit = 20) {
  return db
    .select()
    .from(searchRuns)
    .where(eq(searchRuns.businessId, businessId))
    .orderBy(desc(searchRuns.requestedAt))
    .limit(limit);
}

export async function getSearchRunDetails(runId: string) {
  const [run] = await db
    .select()
    .from(searchRuns)
    .where(eq(searchRuns.id, runId))
    .limit(1);

  if (!run) return null;

  const results = await db
    .select()
    .from(searchResults)
    .where(eq(searchResults.searchRunId, runId))
    .orderBy(searchResults.rank);

  return {
    ...run,
    results,
  };
}
