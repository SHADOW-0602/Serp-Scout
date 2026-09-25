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
  sourceEvidence?: string;
  sourceUrl?: string;
  isLiveGrounded?: boolean;
  features?: {
    hasOnlineBooking: boolean;
    hasEmergencyService: boolean;
    hasTransparentPricing: boolean;
    hasSatisfactionGuarantee: boolean;
  };
}

export interface MarketPatternInsight {
  pattern: string; // e.g., "4 of 5 competitors promote same-day appointments"
  observedFacts: string[]; // actual quotes / snippets
  aiInterpretation: string; // what this means for market expectations
  recommendedAction: string; // concrete recommendation for user's business
}

export interface DeployableHeadline {
  hook: string;
  rationale: string;
  targetLocationOrService?: string;
}

export interface MessagingAnalysisResult {
  competitors: CompetitorMessagingProfile[];
  marketPatterns: MarketPatternInsight[];
  overallTakeaway: string;
  deployableHeadlines: DeployableHeadline[];
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
    liveMeta?: {
      title?: string;
      description?: string;
      h1?: string;
    };
    extractedProfile?: {
      bookingTech?: string[];
      offers?: string[];
      callsToAction?: string[];
      phone?: string;
      hasOnlineBooking?: boolean;
    };
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
      deployableHeadlines: [],
    };
  }

  try {
    const groq = getGroqClient(apiKey);

    const prompt = `You are an expert brand positioning and competitor messaging analyst.
Evaluate the messaging, offers, and positioning patterns of these local competitors against the target business using the REAL verified evidence provided.

Target Business: "${business.name}" in "${business.city || 'Local'}" (Services: ${business.services.join(', ')})

REAL Verified Competitor Evidence (Extracted from Google Search Results, live homepage meta tags, and verified profiles):
${JSON.stringify(competitorData.slice(0, 6), null, 2)}

Instructions:
1. For EACH competitor, examine their REAL snippets, meta descriptions, titles, and extracted profiles:
   - headline: their primary verified landing/page title or H1 proposition
   - primaryOffer: what they explicitly lead with or offer (e.g. "$99 New Patient Special", "Free 3D Smile Scan", "Emergency Care")
   - differentiator: what makes them unique based on their evidence
   - priceLanguage: exact or general price terms mentioned (or null if absent)
   - guarantees: satisfaction, painless, or warranty statements (or null if absent)
   - speedOfService: same day, 24/7, emergency, quick turnaround (or null if absent)
   - cta: main call to action ("Book Online", "Call Now", "Free Consultation")
   - trustSignals: badges, years in business, board certified, 5-star ratings observed
   - sourceEvidence: direct excerpt or quote from their snippets/meta tags that proves this messaging
   - sourceUrl: their websiteUrl or search result link
   - isLiveGrounded: true if derived from snippets/meta/profile, false if inferred
   - features: boolean flags { "hasOnlineBooking": boolean, "hasEmergencyService": boolean, "hasTransparentPricing": boolean, "hasSatisfactionGuarantee": boolean }

2. Identify 2 to 4 REPEATED MARKET PATTERNS across the competitors (e.g., "3 of 4 competitors promote same-day emergency visits", "Most competitors highlight online self-scheduling").
   - Clearly separate:
     a) observedFacts: direct snippets/quotes from evidence
     b) aiInterpretation: what customers expect in this market
     c) recommendedAction: exact counter-positioning action for "${business.name}"

3. Generate 3 to 4 "deployableHeadlines" for "${business.name}"'s website:
   - hook: high-converting headline copy engineered to outposition these rivals
   - rationale: why this beats the observed competitor messaging
   - targetLocationOrService: target page or service (e.g. "Hero / Homepage", "Emergency Service Page")

4. Provide a concise overallTakeaway summary.

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
      "trustSignals": ["..."],
      "sourceEvidence": "...",
      "sourceUrl": "...",
      "isLiveGrounded": true,
      "features": {
        "hasOnlineBooking": true,
        "hasEmergencyService": false,
        "hasTransparentPricing": true,
        "hasSatisfactionGuarantee": false
      }
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
  "deployableHeadlines": [
    {
      "hook": "Seen Today, Guaranteed — Transparent Pricing with Zero Surprise Fees",
      "rationale": "Directly counters rival lack of pricing transparency while matching market same-day demand.",
      "targetLocationOrService": "Hero / Homepage"
    }
  ],
  "overallTakeaway": "..."
}`;

    const completion = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert marketing messaging analyst. Always return valid JSON grounded in provided evidence.',
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
      deployableHeadlines: Array.isArray(parsed.deployableHeadlines) ? parsed.deployableHeadlines : [],
      overallTakeaway: parsed.overallTakeaway || 'Market messaging analysis completed.',
    };
  } catch (err) {
    console.error('Competitor messaging analysis failed:', err);
    return {
      competitors: competitorData.map((c) => ({
        competitorName: c.name,
        domain: c.domain,
        headline: c.liveMeta?.title || c.titles?.[0] || c.name,
        primaryOffer: c.extractedProfile?.offers?.[0] || 'Full Service Care',
        differentiator: 'Established local provider',
        priceLanguage: null,
        guarantees: null,
        speedOfService: null,
        cta: c.extractedProfile?.callsToAction?.[0] || 'Book Online',
        trustSignals: ['Local Practice'],
        sourceEvidence: c.liveMeta?.description || c.snippets?.[0] || 'Direct local search result',
        sourceUrl: c.websiteUrl,
        isLiveGrounded: Boolean(c.snippets?.length || c.liveMeta),
        features: {
          hasOnlineBooking: Boolean(c.extractedProfile?.hasOnlineBooking),
          hasEmergencyService: false,
          hasTransparentPricing: false,
          hasSatisfactionGuarantee: false,
        },
      })),
      marketPatterns: [
        {
          pattern: 'Competitors emphasize comprehensive care and local roots',
          observedFacts: competitorData.map((c) => c.liveMeta?.title || c.titles?.[0] || c.name),
          aiInterpretation: 'Local market values established trust and clear service offerings.',
          recommendedAction: 'Highlight user reviews and local community trust prominently on the homepage.',
        },
      ],
      deployableHeadlines: [
        {
          hook: `The Trusted ${business.services[0] || 'Service'} Specialists in ${business.city || 'Your Area'}`,
          rationale: 'Establishes immediate authority and direct local relevance.',
          targetLocationOrService: 'Hero / Homepage',
        },
      ],
      overallTakeaway: 'Competitors focus heavily on credibility and comprehensive local service options.',
    };
  }
}
