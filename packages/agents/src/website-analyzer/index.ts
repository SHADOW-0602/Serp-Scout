import { WebsiteAnalysis } from '@serp-scout/types';
import { safeFetchWebsite } from './fetcher.js';
import { parseWebsiteHtml } from './parser.js';
import { getGroqClient, DEFAULT_GROQ_MODEL } from '../groq-client.js';

export * from './fetcher.js';
export * from './parser.js';

export interface WebsiteAnalyzerOptions {
  businessNameHint?: string;
  industryHint?: string;
  cityHint?: string;
  apiKey?: string;
}

export async function analyzeWebsite(
  url: string,
  options: WebsiteAnalyzerOptions = {}
): Promise<WebsiteAnalysis> {
  // 1. Safe fetch
  const fetchResult = await safeFetchWebsite(url);

  // 2. Parse HTML
  const parsed = parseWebsiteHtml(fetchResult.html, fetchResult.url);

  // 3. AI Enrichment via Groq
  const groq = getGroqClient(options.apiKey);

  const prompt = `You are the Website Analysis Agent for Serp-Scout, an SEO intelligence platform for small businesses.
Analyze this website's extracted data and produce a structured competitive SEO profile.

Website URL: ${fetchResult.url}
Hints:
- Business Name Hint: ${options.businessNameHint || 'None'}
- Industry Hint: ${options.industryHint || 'None'}
- Location Hint: ${options.cityHint || 'None'}

Extracted HTML Metadata:
- Page Title: ${parsed.title || 'N/A'}
- Meta Description: ${parsed.metaDescription || 'N/A'}
- H1 Headings: ${JSON.stringify(parsed.h1)}
- H2 Headings: ${JSON.stringify(parsed.h2.slice(0, 10))}
- Existing Internal Pages: ${JSON.stringify(parsed.internalLinks.slice(0, 20))}
- Calls to Action: ${JSON.stringify(parsed.callsToAction)}
- Body Text Snippet: ${parsed.mainTextSnippet}

Respond with a JSON object matching this exact structure:
{
  "detectedCategory": "Primary category (e.g. Cosmetic Dentist)",
  "detectedServices": ["service 1", "service 2", "service 3"],
  "detectedLocations": ["City or neighborhood 1", "Region 2"],
  "missingOpportunities": {
    "servicePages": ["Obvious missing high-intent service pages that competitors usually have"],
    "locationPages": ["Obvious missing location/suburb pages"]
  },
  "candidateKeywords": [
    "5 to 8 high-intent commercial and local search phrases customers use to find this business"
  ],
  "candidateCompetitorQueries": [
    "best {service} in {city}",
    "{category} near me",
    "{service} pricing {city}"
  ]
}

Return ONLY raw JSON, with no markdown code fences or commentary.`;

  const completion = await groq.chat.completions.create({
    model: DEFAULT_GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert SEO analyst. Respond ONLY with valid, raw JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content || '{}';
  let aiOutput: any = {};
  try {
    aiOutput = JSON.parse(content);
  } catch (err) {
    console.warn('Failed to parse Groq response as JSON, using fallback structure:', err);
  }

  return {
    url: fetchResult.url,
    businessName: options.businessNameHint || parsed.title,
    detectedCategory: aiOutput.detectedCategory || options.industryHint || 'Local Business',
    detectedServices: Array.isArray(aiOutput.detectedServices) ? aiOutput.detectedServices : [],
    detectedLocations: Array.isArray(aiOutput.detectedLocations)
      ? aiOutput.detectedLocations
      : options.cityHint
      ? [options.cityHint]
      : [],
    metaTitle: parsed.title,
    metaDescription: parsed.metaDescription,
    headings: {
      h1: parsed.h1,
      h2: parsed.h2,
      h3: parsed.h3,
    },
    callsToAction: parsed.callsToAction,
    contactDetails: {
      phone: parsed.phones[0],
      email: parsed.emails[0],
      bookingUrl: parsed.bookingUrls[0],
    },
    missingOpportunities: {
      servicePages: Array.isArray(aiOutput.missingOpportunities?.servicePages)
        ? aiOutput.missingOpportunities.servicePages
        : [],
      locationPages: Array.isArray(aiOutput.missingOpportunities?.locationPages)
        ? aiOutput.missingOpportunities.locationPages
        : [],
    },
    candidateKeywords: Array.isArray(aiOutput.candidateKeywords) ? aiOutput.candidateKeywords : [],
    candidateCompetitorQueries: Array.isArray(aiOutput.candidateCompetitorQueries)
      ? aiOutput.candidateCompetitorQueries
      : [],
  };
}
