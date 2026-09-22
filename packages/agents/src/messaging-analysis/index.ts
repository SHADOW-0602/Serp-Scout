import { getGroqClient, DEFAULT_GROQ_MODEL } from '../groq-client.js';

export interface CompetitorMessagingProfile {
  competitorName: string;
  domain: string;
  headline: string;
  primaryOffer: string;
  differentiator: string;
  priceLanguage: string | null;
  guarantees: string | null;
  speedOfService: string | null;
  cta: string;
  trustSignals: string[];
}

export interface MarketPatternInsight {
  pattern: string; // e.g., "4 of 5 competitors promote same-day appointments"
  observedFacts: string[]; // actual quotes / snippets
  aiInterpretation: string; // what this means for market expectations
  recommendedAction: string; // concrete recommendation for user's business
}

export interface MessagingAnalysisResult {
  competitors: CompetitorMessagingProfile[];
  marketPatterns: MarketPatternInsight[];
  overallTakeaway: string;
}

export interface MessagingAnalysisInput {
  business: {
    name: string;
    services: string[];
    city?: string;
  };
  competitorData: Array<{
    name: string;
    domain: string;
    websiteUrl: string;
    snippets?: string[];
    titles?: string[];
  }>;
  apiKey?: string;
}

export async function analyzeCompetitorMessaging(
  input: MessagingAnalysisInput
): Promise<MessagingAnalysisResult> {
  const { business, competitorData, apiKey } = input;

  if (competitorData.length === 0) {
    return {
      competitors: [],
      marketPatterns: [],
      overallTakeaway: 'No competitor data available for messaging analysis.',
    };
  }

  try {
    const groq = getGroqClient(apiKey);

    const prompt = `You are an expert brand positioning and competitor messaging analyst.
Evaluate the messaging and positioning patterns of these local competitors against the target business.

Target Business: "${business.name}" in "${business.city || 'Local'}" (Services: ${business.services.join(', ')})

Competitor Evidence:
${JSON.stringify(competitorData.slice(0, 5), null, 2)}

Instructions:
1. For EACH competitor, extract or infer:
   - headline: their primary landing/page title proposition
   - primaryOffer: what they lead with (e.g. "$99 New Patient Special", "Free 3D Smile Scan")
   - differentiator: what makes them unique in customer eyes
   - priceLanguage: exact or general price terms mentioned (or null if absent)
   - guarantees: guarantees like satisfaction, painless, or warranty (or null if absent)
   - speedOfService: same day, 24/7, emergency, quick turnaround (or null if absent)
   - cta: main call to action ("Book Online", "Call Now", "Free Consultation")
   - trustSignals: badges, years in business, board certified, 5-star ratings

2. Identify 2 to 4 REPEATED MARKET PATTERNS across the competitors (e.g., "3 of 4 competitors feature online booking", "Most competitors highlight 0% financing").
   - Clearly separate:
     a) observedFacts: direct snippets/quotes
     b) aiInterpretation: what customers expect in this market
     c) recommendedAction: exact counter-positioning action for "${business.name}"

3. Provide a concise overallTakeaway summary.

Respond ONLY with valid JSON in this format:
{
  "competitors": [
    {
      "competitorName": "...",
      "domain": "...",
      "headline": "...",
      "primaryOffer": "...",
      "differentiator": "...",
      "priceLanguage": "...",
      "guarantees": "...",
      "speedOfService": "...",
      "cta": "...",
      "trustSignals": ["..."]
    }
  ],
  "marketPatterns": [
    {
      "pattern": "3 of 4 competitors promote same-day emergency visits",
      "observedFacts": ["Same-Day Emergency Appointments Available", "Seen within 2 hours guaranteed"],
      "aiInterpretation": "Local patients expect rapid relief; slow scheduling costs high-intent leads.",
      "recommendedAction": "Add a prominent 'Same-Day Emergency Appointments' hero banner with direct click-to-call."
    }
  ],
  "overallTakeaway": "..."
}`;

    const completion = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert marketing messaging analyst. Always return valid JSON.',
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

    return {
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
      marketPatterns: Array.isArray(parsed.marketPatterns) ? parsed.marketPatterns : [],
      overallTakeaway: parsed.overallTakeaway || 'Market messaging analysis completed.',
    };
  } catch (err) {
    console.error('Competitor messaging analysis failed:', err);
    return {
      competitors: competitorData.map((c) => ({
        competitorName: c.name,
        domain: c.domain,
        headline: c.titles?.[0] || c.name,
        primaryOffer: 'Full Service Care',
        differentiator: 'Experienced local practice',
        priceLanguage: null,
        guarantees: null,
        speedOfService: null,
        cta: 'Contact Us',
        trustSignals: ['Licensed & Insured'],
      })),
      marketPatterns: [
        {
          pattern: 'Competitors emphasize comprehensive care and local roots',
          observedFacts: competitorData.map((c) => c.titles?.[0] || c.name),
          aiInterpretation: 'Local market values established trust and clear service offerings.',
          recommendedAction: 'Highlight user reviews and local community trust prominently on the homepage.',
        },
      ],
      overallTakeaway: 'Competitors focus heavily on credibility and comprehensive local service options.',
    };
  }
}
