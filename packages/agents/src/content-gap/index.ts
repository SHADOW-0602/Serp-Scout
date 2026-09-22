import { ContentGap, SearchIntent } from '@serp-scout/types';
import { getGroqClient, DEFAULT_GROQ_MODEL } from '../groq-client.js';

export interface ContentGapInput {
  business: {
    name: string;
    websiteUrl: string;
    services: string[];
    city?: string;
  };
  competitors: Array<{
    name: string;
    domain: string;
    websiteUrl: string;
    observedSnippets?: string[];
    titles?: string[];
  }>;
  serpQueries?: string[];
  apiKey?: string;
}

export async function analyzeContentGaps(input: ContentGapInput): Promise<ContentGap[]> {
  const { business, competitors, serpQueries = [], apiKey } = input;

  if (competitors.length === 0) {
    return [];
  }

  try {
    const groq = getGroqClient(apiKey);

    const competitorSummaries = competitors.slice(0, 5).map((c) => ({
      name: c.name,
      domain: c.domain,
      url: c.websiteUrl,
      snippets: (c.observedSnippets || []).slice(0, 4),
      titles: (c.titles || []).slice(0, 4),
    }));

    const prompt = `You are a strategic SEO and Content Strategist for small businesses.
Analyze this business vs its top local competitors to uncover high-impact CONTENT GAPS.

Target Business:
- Name: "${business.name}"
- Website: "${business.websiteUrl}"
- Services Offered: ${JSON.stringify(business.services)}
- Location: "${business.city || 'Local Area'}"

Competitors Context:
${JSON.stringify(competitorSummaries, null, 2)}

Target Queries / SERP context:
${JSON.stringify(serpQueries.slice(0, 10))}

Task:
Identify 3 to 6 high-value topic or content gaps where competitors have dedicated pages, better service coverage, or satisfy customer intent that the target business does not adequately cover on its site.

For each gap, generate:
1. topic: clear name of missing topic / page concept (e.g. "Emergency Dental Implants Guide & Cost", "South Austin Invisalign Provider")
2. competitorDomain: which competitor is outranking or providing this
3. competitorUrl: competitor URL or best URL guess based on domain
4. recommendedPageType: exactly one of ["service", "location", "faq", "comparison", "guide"]
5. suggestedTitle: compelling, click-worthy SEO title tag
6. suggestedHeadings: 3 to 5 H2/H3 subheadings
7. suggestedFaqs: 2 to 3 practical customer questions to answer
8. targetIntent: exactly one of ["informational", "commercial", "transactional", "local", "navigational", "comparison", "problem-based"]
9. estimatedImpact: "high" | "medium" | "low"
10. estimatedEffort: "low" | "medium" | "high"
11. priority: "P0" | "P1" | "P2" | "P3" (P0 = high impact / low effort, P1 = high impact / medium effort, P2 = medium impact, P3 = low priority)
12. evidenceUrls: array of competitor URLs or domains supporting this gap

Respond ONLY with valid JSON in this exact structure:
{
  "gaps": [
    {
      "topic": "...",
      "competitorDomain": "...",
      "competitorUrl": "...",
      "recommendedPageType": "service",
      "suggestedTitle": "...",
      "suggestedHeadings": ["..."],
      "suggestedFaqs": ["..."],
      "targetIntent": "commercial",
      "estimatedImpact": "high",
      "estimatedEffort": "medium",
      "priority": "P1",
      "evidenceUrls": ["..."]
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO Content Gap analyst. Return valid JSON only.',
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
    const rawGaps: any[] = Array.isArray(parsed.gaps) ? parsed.gaps : [];

    const validPageTypes = ['service', 'location', 'faq', 'comparison', 'guide'] as const;
    const validIntents: SearchIntent[] = [
      'informational',
      'commercial',
      'transactional',
      'local',
      'navigational',
      'comparison',
      'problem-based',
    ];
    const validPriorities = ['P0', 'P1', 'P2', 'P3'] as const;

    return rawGaps.map((g) => ({
      topic: g.topic || 'Missing Service Opportunity',
      competitorDomain: g.competitorDomain || competitors[0].domain,
      competitorUrl: g.competitorUrl || competitors[0].websiteUrl,
      recommendedPageType: validPageTypes.includes(g.recommendedPageType)
        ? g.recommendedPageType
        : 'service',
      suggestedTitle: g.suggestedTitle || `${g.topic} in ${business.city || 'Austin'}`,
      suggestedHeadings: Array.isArray(g.suggestedHeadings) ? g.suggestedHeadings : [],
      suggestedFaqs: Array.isArray(g.suggestedFaqs) ? g.suggestedFaqs : [],
      targetIntent: validIntents.includes(g.targetIntent) ? g.targetIntent : 'commercial',
      estimatedImpact: ['high', 'medium', 'low'].includes(g.estimatedImpact)
        ? g.estimatedImpact
        : 'medium',
      estimatedEffort: ['low', 'medium', 'high'].includes(g.estimatedEffort)
        ? g.estimatedEffort
        : 'medium',
      priority: validPriorities.includes(g.priority) ? g.priority : 'P1',
      evidenceUrls: Array.isArray(g.evidenceUrls) ? g.evidenceUrls : [competitors[0].websiteUrl],
    }));
  } catch (err) {
    console.error('Failed to analyze content gaps with Groq:', err);
    // Fallback heuristic generator
    return competitors.slice(0, 2).map((comp, idx) => ({
      topic: `${business.services[0] || 'Service'} Comparison & Pricing`,
      competitorDomain: comp.domain,
      competitorUrl: comp.websiteUrl,
      recommendedPageType: 'service',
      suggestedTitle: `Affordable ${business.services[0] || 'Care'} in ${business.city || 'Austin'}`,
      suggestedHeadings: ['Transparent Pricing', 'Our Process', 'Frequently Asked Questions'],
      suggestedFaqs: ['How much does treatment cost?', 'Is insurance accepted?'],
      targetIntent: 'commercial',
      estimatedImpact: 'high',
      estimatedEffort: 'medium',
      priority: idx === 0 ? 'P0' : 'P1',
      evidenceUrls: [comp.websiteUrl],
    }));
  }
}
