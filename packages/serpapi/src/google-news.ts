import { NormalizedNewsResult, SerpSearchParams } from '@serp-scout/types';
import { executeSerpApiRequest } from './client.js';
import { normalizeNewsResult } from './normalizer.js';

export interface GoogleNewsSearchResponse {
  results: NormalizedNewsResult[];
  raw?: Record<string, any>;
}

export async function searchGoogleNews(
  params: SerpSearchParams,
  apiKey: string
): Promise<GoogleNewsSearchResponse> {
  const data = await executeSerpApiRequest<{
    news_results?: Record<string, any>[];
  }>({
    engine: 'google_news',
    apiKey,
    params: {
      q: params.query,
      hl: params.language || 'en',
      gl: params.country || 'us',
    },
  });

  const news = data.news_results || [];
  const results = news.map((item, idx) => normalizeNewsResult(item, idx));

  return {
    results,
    raw: data,
  };
}
