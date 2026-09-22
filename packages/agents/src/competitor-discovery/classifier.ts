import { CompetitorType } from '@serp-scout/types';
import { getGroqClient, DEFAULT_GROQ_MODEL } from '../groq-client.js';
import { ExtractedCandidateDomain } from './candidate-extractor.js';

const KNOWN_DIRECTORIES = new Set([
  'yelp.com',
  'yellowpages.com',
  'angi.com',
  'angieslist.com',
  'healthgrades.com',
  'clutch.co',
  'tripadvisor.com',
  'expertise.com',
  'bbb.org',
  'thumbtack.com',
  'zocdoc.com',
  'opentable.com',
  'mapquest.com',
  'superpages.com',
  'foursquare.com',
  'dentrix.com',
  '1800dentist.com',
]);

const KNOWN_PUBLISHERS = new Set([
  'wikipedia.org',
  'webmd.com',
  'healthline.com',
  'mayoclinic.org',
  'forbes.com',
  'nytimes.com',
  'reddit.com',
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
]);

export interface ClassifierBusinessContext {
  businessName: string;
  category: string;
  services: string[];
  city: string;
}

export function fastClassifyByDomain(domain: string): CompetitorType | null {
  const root = domain.toLowerCase().replace(/^www\./, '');
  if (KNOWN_DIRECTORIES.has(root)) return 'directory';
  if (KNOWN_PUBLISHERS.has(root)) return 'publisher';
  return null;
}

export async function classifyCompetitorCandidate(
  candidate: ExtractedCandidateDomain,
  context: ClassifierBusinessContext,
  apiKey?: string
): Promise<{ competitorType: CompetitorType; reasoning: string }> {
  // 1. Fast heuristic classification
  const fast = fastClassifyByDomain(candidate.domain);
  if (fast) {
    return {
      competitorType: fast,
      reasoning: `Domain "${candidate.domain}" is a known aggregator / ${fast}.`,
    };
  }

  // 2. Groq AI classification for business candidates
  const groq = getGroqClient(apiKey);

  const prompt = `You are the Competitor Classification Agent for Serp-Scout.
Classify this search result candidate into exactly ONE of the 7 competitor types:
- "direct": Same primary business services in the same local market (true competitor)
- "geographic": Same service category, but located in an adjacent city/suburb or different neighborhood
- "search": Competes heavily on Google queries (large chain, franchise, or aggregator), but distinct business model
- "indirect": Offers an alternative solution to the same underlying customer problem
- "directory": Local business directory, review site, or marketplace aggregator
- "publisher": Educational blog, news publisher, medical portal, or social network
- "irrelevant": Government, generic software, unrelated industry

User Business Profile:
- Name: ${context.businessName}
- Category: ${context.category}
- Primary Services: ${context.services.join(', ')}
- Target City: ${context.city}

Candidate to Classify:
- Domain: ${candidate.domain}
- Name: ${candidate.name}
- Extracted Category: ${candidate.category || 'N/A'}
- Address: ${candidate.address || 'N/A'}
- Queries it ranked for: ${candidate.queriesAppearedIn.join('; ')}
- Observed Snippets: ${candidate.observedSnippets.slice(0, 3).join(' | ')}

Respond ONLY with valid JSON:
{
  "competitorType": "direct" | "geographic" | "search" | "indirect" | "directory" | "publisher" | "irrelevant",
  "reasoning": "1 sentence explanation"
}`;

  try {
    const resp = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: 'system', content: 'Respond ONLY with valid raw JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(resp.choices[0]?.message?.content || '{}');
    const type = parsed.competitorType as CompetitorType;
    const validTypes: CompetitorType[] = [
      'direct',
      'geographic',
      'search',
      'indirect',
      'directory',
      'publisher',
      'irrelevant',
    ];

    return {
      competitorType: validTypes.includes(type) ? type : 'search',
      reasoning: parsed.reasoning || 'Classified based on search visibility overlap',
    };
  } catch (err) {
    console.warn(`Groq classification failed for ${candidate.domain}, defaulting to search competitor:`, err);
    return {
      competitorType: 'search',
      reasoning: 'Fallback classification based on SERP appearances',
    };
  }
}
