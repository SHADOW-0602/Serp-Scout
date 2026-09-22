import { Annotation } from '@langchain/langgraph';
import {
  WebsiteAnalysis,
  CompetitorCandidate,
  KeywordCandidate,
  ContentGap,
  Recommendation,
  GeneratedReport,
  NormalizedSearchResult,
  NormalizedMapsResult,
  NormalizedNewsResult,
} from '@serp-scout/types';

export interface AgentContext {
  businessId: string;
  businessName?: string;
  websiteUrl?: string;
  industry?: string;
  city?: string;
  country?: string;
  serviceArea?: string;
}

export const AgentStateAnnotation = Annotation.Root({
  // Business context
  context: Annotation<AgentContext>(),

  // Pipeline stage outputs
  websiteAnalysis: Annotation<WebsiteAnalysis | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Search Results
  organicResults: Annotation<NormalizedSearchResult[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),
  mapsResults: Annotation<NormalizedMapsResult[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),
  newsResults: Annotation<NormalizedNewsResult[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),

  // Competitors & Keywords
  competitorCandidates: Annotation<CompetitorCandidate[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),
  keywordCandidates: Annotation<KeywordCandidate[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),

  // Gaps & Recommendations
  contentGaps: Annotation<ContentGap[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),
  recommendations: Annotation<Recommendation[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),

  // Final Generated Report
  report: Annotation<GeneratedReport | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Accumulated errors across nodes
  errors: Annotation<string[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
export type AgentStateUpdate = typeof AgentStateAnnotation.Update;
