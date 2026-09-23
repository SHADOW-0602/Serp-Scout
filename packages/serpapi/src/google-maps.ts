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
  let q = params.query;
  let location = params.location;

  if (location) {
    const locLower = location.toLowerCase().trim();
    const queryLower = q.toLowerCase();
    const isDetailedOrCustomLocation =
      location.includes('/') ||
      location.includes('#') ||
      locLower.includes('mall') ||
      locLower.includes('street') ||
      locLower.includes('road') ||
      locLower.includes('market') ||
      locLower.includes('sector');

    if (queryLower.includes(locLower)) {
      // Query already contains the location; avoid passing location param to bypass SerpApi strict matching
      location = undefined;
    } else if (isDetailedOrCustomLocation) {
      // Absorb detailed street/mall location into the search query
      q = `${q} in ${location}`.trim();
      location = undefined;
    }
  }

  const data = await executeSerpApiRequest<{
    local_results?: Record<string, any>[];
  }>({
    engine: 'google_maps',
    apiKey,
    params: {
      q,
      location,
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
