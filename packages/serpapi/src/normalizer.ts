import {
  NormalizedSearchResult,
  NormalizedMapsResult,
  NormalizedNewsResult,
} from '@serp-scout/types';

export function normalizeOrganicResult(
  item: Record<string, any>,
  index: number
): NormalizedSearchResult {
  let domain = '';
  try {
    const urlObj = new URL(item.link || item.url || '');
    domain = urlObj.hostname.replace(/^www\./, '');
  } catch {
    domain = item.domain || '';
  }

  const sitelinks: Array<{ title: string; link: string }> = [];
  if (Array.isArray(item.sitelinks?.inline)) {
    for (const sl of item.sitelinks.inline) {
      if (sl.title && sl.link) sitelinks.push({ title: sl.title, link: sl.link });
    }
  }

  const serpFeatures: string[] = [];
  if (item.sitelinks) serpFeatures.push('sitelinks');
  if (item.rich_snippet) serpFeatures.push('rich_snippet');

  return {
    rank: item.position || index + 1,
    title: item.title || '',
    url: item.link || item.url || '',
    domain,
    snippet: item.snippet || item.description || '',
    sitelinks: sitelinks.length > 0 ? sitelinks : undefined,
    serpFeatures: serpFeatures.length > 0 ? serpFeatures : undefined,
    raw: item,
  };
}

export function normalizeMapsResult(
  item: Record<string, any>,
  index: number
): NormalizedMapsResult {
  return {
    rank: item.position || index + 1,
    title: item.title || item.name || '',
    placeId: item.place_id || item.data_id,
    address: item.address,
    rating: typeof item.rating === 'number' ? item.rating : undefined,
    reviewsCount: typeof item.reviews === 'number' ? item.reviews : undefined,
    category: item.type || item.category,
    website: item.website || item.link,
    phone: item.phone,
    latitude: item.gps_coordinates?.latitude,
    longitude: item.gps_coordinates?.longitude,
    hours: typeof item.hours === 'string' ? item.hours : undefined,
    raw: item,
  };
}

export function normalizeNewsResult(
  item: Record<string, any>,
  index: number
): NormalizedNewsResult {
  return {
    rank: item.position || index + 1,
    title: item.title || '',
    source: item.source?.name || item.source || '',
    link: item.link || item.url || '',
    snippet: item.snippet || '',
    date: item.date,
    thumbnail: item.thumbnail,
    raw: item,
  };
}

export function normalizeAdResult(
  item: Record<string, any>,
  index: number
): NormalizedSearchResult {
  let domain = '';
  try {
    const urlObj = new URL(item.link || item.url || '');
    domain = urlObj.hostname.replace(/^www\./, '');
  } catch {
    domain = item.domain || '';
  }

  return {
    rank: item.position || index + 1,
    title: item.title || '',
    url: item.link || item.url || '',
    domain,
    snippet: item.snippet || item.description || '',
    serpFeatures: ['google_ads', 'sponsored'],
    isAd: true,
    raw: item,
  };
}
