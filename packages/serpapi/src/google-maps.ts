import { NormalizedMapsResult, SerpSearchParams } from '@serp-scout/types';
import { executeSerpApiRequest } from './client.js';
import { normalizeMapsResult } from './normalizer.js';

export interface GoogleMapsSearchResponse {
  results: NormalizedMapsResult[];
  raw?: Record<string, any>;
}

export async function searchGoogleMaps(
  params: SerpSearchParams,
  apiKey: string
): Promise<GoogleMapsSearchResponse> {
  const data = await executeSerpApiRequest<{
    local_results?: Record<string, any>[];
  }>({
    engine: 'google_maps',
    apiKey,
    params: {
      q: params.query,
      location: params.location,
      hl: params.language || 'en',
    },
  });

  const locals = data.local_results || [];
  const results = locals.map((item, idx) => normalizeMapsResult(item, idx));

  return {
    results,
    raw: data,
  };
}
