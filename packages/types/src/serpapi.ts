export type SerpApiEngine = 'google' | 'google_maps' | 'google_news' | 'google_shopping';

export interface NormalizedSearchResult {
  rank: number;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  sitelinks?: Array<{ title: string; link: string }>;
  serpFeatures?: string[];
  isAd?: boolean;
  raw?: Record<string, unknown>;
}

export interface NormalizedMapsResult {
  rank: number;
  title: string;
  placeId?: string;
  address?: string;
  rating?: number;
  reviewsCount?: number;
  category?: string;
  website?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  hours?: string;
  raw?: Record<string, unknown>;
}

export interface NormalizedNewsResult {
  rank: number;
  title: string;
  source: string;
  link: string;
  snippet?: string;
  date?: string;
  thumbnail?: string;
  raw?: Record<string, unknown>;
}

export interface SerpSearchParams {
  query: string;
  location?: string;
  language?: string;
  country?: string;
  device?: 'desktop' | 'mobile';
  page?: number;
  num?: number;
}
