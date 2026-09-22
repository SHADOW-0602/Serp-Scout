import { Recommendation, ContentGap, ReviewTheme, NewsSignal } from '@serp-scout/types';
import { getGroqClient, DEFAULT_GROQ_MODEL } from '../groq-client.js';

export interface RecommendationEngineInput {
  business: {
    name: string;
    websiteUrl: string;
    services: string[];
    city?: string;
  };
  rankingChanges?: Array<{
    phrase: string;
    currentRank: number | null;
    previousRank: number | null;
    delta: number | null;
    bestCompetitorRank?: number | null;
    bestCompetitorDomain?: string | null;
  }>;
  contentGaps?: ContentGap[];
  messagingPatterns?: Array<{
    pattern: string;
    observedFacts: string[];
    aiInterpretation: string;
    recommendedAction: string;
  }>;
  reviewThemes?: ReviewTheme[];
  newsSignals?: NewsSignal[];
  apiKey?: string;
}

export async function generateRecommendations(
  input: RecommendationEngineInput
): Promise<Recommendation[]> {
  const {
    business,
    rankingChanges = [],
    contentGaps = [],
    messagingPatterns = [],
    reviewThemes = [],
    newsSignals = [],
    apiKey,
  } = input;

  // Rule: Do not generate recommendations from empty evidence set
  const hasEvidence =
    rankingChanges.length > 0 ||
    contentGaps.length > 0 ||
    messagingPatterns.length > 0 ||
    reviewThemes.length > 0 ||
    newsSignals.length > 0;

  if (!hasEvidence) {
    return [];
  }

  try {
    const groq = getGroqClient(apiKey);

    const prompt = `You are the lead strategic consultant for a local business SEO and market growth intelligence platform.
Tagline: "Success is measured by real business outcomes rather than a 'visibility score.'"

Your task is to synthesize all gathered competitive evidence into EXACTLY 3 TO 5 PRIORITIZED ACTIONS for the upcoming week.

Target Business:
- Name: "${business.name}"
- Website: "${business.websiteUrl}"
- Services: ${JSON.stringify(business.services)}
- City/Location: "${business.city || 'Local'}"

Evidence Inputs:
1. Keyword Ranking Shifts & Competitor Benchmarks:
${JSON.stringify(rankingChanges.slice(0, 8), null, 2)}

2. Top Identified Content Gaps:
${JSON.stringify(contentGaps.slice(0, 5), null, 2)}

3. Competitor Messaging Patterns:
${JSON.stringify(messagingPatterns.slice(0, 4), null, 2)}

4. Customer Review Voice & Themes:
${JSON.stringify(reviewThemes.slice(0, 5), null, 2)}

5. Market & News Signals:
${JSON.stringify(newsSignals.slice(0, 4), null, 2)}

Rules for Recommendations (Plan.md §5.12):
1. PRODUCE BETWEEN 3 AND 5 ACTIONS ONLY (no fluff, strictly prioritized).
2. Priority levels:
   - "P0": High impact, low effort (do immediately)
   - "P1": High impact, medium effort
   - "P2": Medium impact, medium effort
   - "P3": Low impact, high effort
3. EVERY action must have concrete evidence:
   - title: Clear, imperative action verb phrase (e.g. "Launch South Austin Invisalign Landing Page", "Update Homepage Hero with 'No Surprise Fees' Guarantee")
   - problem: What specific competitor advantage or customer barrier this solves
   - evidenceSummary: Summarize the exact data proof (quotes, rankings, or rival URLs)
   - sourceUrls: Array of 1 to 3 URLs or competitor domains proving this need
   - searchQueries: Array of 1 to 3 search terms where this problem was observed
   - expectedImpact: "high" | "medium" | "low"
   - estimatedEffort: "low" | "medium" | "high"
   - priority: "P0" | "P1" | "P2" | "P3"
   - confidence: "high" | "medium" | "low"
   - suggestedOwner: e.g. "Web Developer", "Content Lead", "Practice Manager"
   - suggestedDeadline: e.g. "Within 3 days", "Within 1 week"

Respond ONLY with valid JSON in this exact structure:
{
  "recommendations": [
    {
      "title": "...",
      "problem": "...",
      "evidenceSummary": "...",
      "sourceUrls": ["..."],
      "searchQueries": ["..."],
      "expectedImpact": "high",
      "estimatedEffort": "low",
      "priority": "P0",
      "confidence": "high",
      "suggestedOwner": "Content Lead",
      "suggestedDeadline": "Within 5 days"
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an elite business outcomes and SEO recommendation engine. Return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const rawRecs: any[] = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

    // Enforce max 5 actions
    const capped = rawRecs.slice(0, 5);

    const validPriorities = ['P0', 'P1', 'P2', 'P3'] as const;
    const validLevels = ['high', 'medium', 'low'] as const;

    return capped.map((r) => ({
      title: r.title || 'Implement Targeted SEO Optimization',
      problem: r.problem || 'Competitors currently capture high-intent search demand.',
      evidenceSummary: r.evidenceSummary || 'Observed ranking gaps and competitor service pages.',
      sourceUrls: Array.isArray(r.sourceUrls) && r.sourceUrls.length > 0
        ? r.sourceUrls
        : [business.websiteUrl],
      searchQueries: Array.isArray(r.searchQueries) && r.searchQueries.length > 0
        ? r.searchQueries
        : [business.services[0] || 'dentist near me'],
      expectedImpact: validLevels.includes(r.expectedImpact) ? r.expectedImpact : 'high',
      estimatedEffort: validLevels.includes(r.estimatedEffort) ? r.estimatedEffort : 'medium',
      priority: validPriorities.includes(r.priority) ? r.priority : 'P1',
      confidence: validLevels.includes(r.confidence) ? r.confidence : 'high',
      suggestedOwner: r.suggestedOwner || 'Practice Lead',
      suggestedDeadline: r.suggestedDeadline || 'Within 7 days',
    }));
  } catch (err) {
    console.error('Failed to generate recommendations with Groq:', err);

    // Heuristic fallback grounded in provided evidence
    const fallbackRecs: Recommendation[] = [];

    if (contentGaps.length > 0) {
      const topGap = contentGaps[0];
      fallbackRecs.push({
        title: `Publish ${topGap.topic} Page`,
        problem: `Rivals like ${topGap.competitorDomain} outrank you for high-intent ${topGap.targetIntent} searches.`,
        evidenceSummary: `Competitor ${topGap.competitorDomain} holds rankings with dedicated ${topGap.recommendedPageType} content.`,
        sourceUrls: topGap.evidenceUrls || [topGap.competitorUrl],
        searchQueries: [topGap.topic],
        expectedImpact: 'high',
        estimatedEffort: 'medium',
        priority: 'P0',
        confidence: 'high',
        suggestedOwner: 'Content Lead',
        suggestedDeadline: 'Within 5 days',
      });
    }

    if (rankingChanges.length > 0) {
      const topKw = rankingChanges[0];
      fallbackRecs.push({
        title: `Optimize Page for "${topKw.phrase}"`,
        problem: `Currently ranked #${topKw.currentRank ?? 'unranked'} while competitor ranks #${topKw.bestCompetitorRank ?? 3}.`,
        evidenceSummary: `Competitor ${topKw.bestCompetitorDomain || 'rival'} holds higher page 1 visibility.`,
        sourceUrls: [business.websiteUrl],
        searchQueries: [topKw.phrase],
        expectedImpact: 'high',
        estimatedEffort: 'low',
        priority: 'P1',
        confidence: 'high',
        suggestedOwner: 'SEO Specialist',
        suggestedDeadline: 'Within 3 days',
      });
    }

    return fallbackRecs;
  }
}
