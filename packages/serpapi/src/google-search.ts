import { NormalizedSearchResult, SerpSearchParams } from '@serp-scout/types';
import { executeSerpApiRequest } from './client.js';
import { normalizeOrganicResult } from './normalizer.js';

export interface GoogleSearchResponse {
  results: NormalizedSearchResult[];
  detectedFeatures: string[];
  paaQuestions: string[];
  totalResults?: number;
  rawSearchInformation?: Record<string, any>;
}

export async function searchGoogle(
  params: SerpSearchParams,
  apiKey: string
): Promise<GoogleSearchResponse> {
  const data = await executeSerpApiRequest<{
    organic_results?: Record<string, any>[];
    local_results?: Record<string, any>[];
    related_questions?: Array<{ question?: string }>;
    knowledge_graph?: Record<string, any>;
    answer_box?: Record<string, any>;
    search_information?: Record<string, any>;
  }>({
    engine: 'google',
    apiKey,
    params: {
      q: params.query,
      location: params.location,
      hl: params.language || 'en',
      gl: params.country || 'us',
      device: params.device || 'desktop',
      num: params.num || 20,
      start: params.page ? (params.page - 1) * (params.num || 20) : undefined,
    },
  });

  const detectedFeatures: string[] = [];
  if (data.local_results && data.local_results.length > 0) detectedFeatures.push('map_pack');
  if (data.related_questions && data.related_questions.length > 0) detectedFeatures.push('paa');
  if (data.knowledge_graph) detectedFeatures.push('knowledge_graph');
  if (data.answer_box) detectedFeatures.push('featured_snippet');

  const paaQuestions: string[] = [];
  if (Array.isArray(data.related_questions)) {
    for (const item of data.related_questions) {
      if (item.question && !paaQuestions.includes(item.question)) {
        paaQuestions.push(item.question);
      }
    }
  }

  const organic = data.organic_results || [];
  const results = organic.map((item, idx) => {
    const normalized = normalizeOrganicResult(item, idx);
    // Combine features
    if (detectedFeatures.length > 0) {
      normalized.serpFeatures = Array.from(new Set([...(normalized.serpFeatures || []), ...detectedFeatures]));
    }
    return normalized;
  });

  return {
    results,
    detectedFeatures,
    paaQuestions,
    totalResults: data.search_information?.total_results,
    rawSearchInformation: data.search_information,
  };
}
