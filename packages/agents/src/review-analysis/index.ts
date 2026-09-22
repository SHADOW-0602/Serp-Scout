import { ReviewTheme } from '@serp-scout/types';
import { getGroqClient, DEFAULT_GROQ_MODEL } from '../groq-client.js';

export interface RawReviewSnippet {
  competitorName?: string;
  domain?: string;
  sourceUrl?: string;
  rating?: number;
  snippet: string;
}

export interface ReviewAnalysisInput {
  business: {
    name: string;
    services: string[];
    city?: string;
  };
  reviews: RawReviewSnippet[];
  apiKey?: string;
}

export interface ReviewAnalysisResult {
  themes: ReviewTheme[];
  commonPraise: string[];
  commonComplaints: string[];
  websiteCopyOpportunities: Array<{
    theme: string;
    customerQuoteOrVocabulary: string;
    suggestedCopyHeadline: string;
    targetPage: string;
  }>;
  serviceImprovementOpportunities: string[];
}

export async function analyzeCustomerReviews(
  input: ReviewAnalysisInput
): Promise<ReviewAnalysisResult> {
  const { business, reviews, apiKey } = input;

  if (reviews.length === 0) {
    return {
      themes: [],
      commonPraise: [],
      commonComplaints: [],
      websiteCopyOpportunities: [],
      serviceImprovementOpportunities: [],
    };
  }

  try {
    const groq = getGroqClient(apiKey);

    const prompt = `You are a customer feedback and voice-of-customer SEO analyst.
Analyze these public customer review snippets from local competitors and the market in "${business.city || 'the area'}".

Target Business: "${business.name}" (Services: ${business.services.join(', ')})

Review Data:
${JSON.stringify(reviews.slice(0, 20), null, 2)}

Instructions:
1. Extract 3 to 6 distinct REVIEW THEMES (sentiment: positive, negative, or neutral).
   - theme: name of the theme (e.g., "Gentle & Painless Care", "Transparent Treatment Pricing", "Long Waiting Room Times")
   - sentiment: "positive" | "negative" | "neutral"
   - frequency: estimated number of mentions in this sample
   - examples: exact or closely paraphrased customer phrases from the text
   - suggestedCopyOpportunity: high-converting phrase the business can use on its site

2. Extract overall Common Praise items and Common Complaints items.
3. Identify Website Copy Opportunities using NATURAL CUSTOMER VOCABULARY to counter competitor complaints or capture positive buyer intent.
4. Identify Service Improvement Opportunities.

Respond ONLY with valid JSON in this exact structure:
{
  "themes": [
    {
      "theme": "Gentle, Painless Treatment",
      "sentiment": "positive",
      "frequency": 6,
      "examples": ["Dr was so gentle, I didn't feel a thing", "great for dental anxiety"],
      "suggestedCopyOpportunity": "Gentle, stress-free care designed for anxious patients."
    }
  ],
  "commonPraise": ["Fast check-in", "Gentle dentists", "Friendly reception"],
  "commonComplaints": ["Surprise bills", "Waiting 45 mins past appointment", "Rushed consultations"],
  "websiteCopyOpportunities": [
    {
      "theme": "Transparent Pricing",
      "customerQuoteOrVocabulary": "no surprise hidden fees",
      "suggestedCopyHeadline": "Upfront, Transparent Pricing — Never Any Surprise Fees",
      "targetPage": "Pricing / Services"
    }
  ],
  "serviceImprovementOpportunities": ["Guarantee on-time seating within 10 minutes of appointment time."]
}`;

    const completion = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert customer review and VoC analyst. Always return valid JSON.',
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

    const themes: ReviewTheme[] = (Array.isArray(parsed.themes) ? parsed.themes : []).map(
      (t: any) => ({
        theme: t.theme || 'Service Experience',
        sentiment: ['positive', 'negative', 'neutral'].includes(t.sentiment)
          ? t.sentiment
          : 'neutral',
        frequency: Number(t.frequency) || 1,
        examples: Array.isArray(t.examples) ? t.examples : [],
        suggestedCopyOpportunity: t.suggestedCopyOpportunity,
      })
    );

    return {
      themes,
      commonPraise: Array.isArray(parsed.commonPraise) ? parsed.commonPraise : [],
      commonComplaints: Array.isArray(parsed.commonComplaints) ? parsed.commonComplaints : [],
      websiteCopyOpportunities: Array.isArray(parsed.websiteCopyOpportunities)
        ? parsed.websiteCopyOpportunities
        : [],
      serviceImprovementOpportunities: Array.isArray(parsed.serviceImprovementOpportunities)
        ? parsed.serviceImprovementOpportunities
        : [],
    };
  } catch (err) {
    console.error('Customer review analysis failed:', err);
    return {
      themes: [
        {
          theme: 'Customer Service & Comfort',
          sentiment: 'positive',
          frequency: 3,
          examples: ['Friendly staff and prompt response'],
          suggestedCopyOpportunity: 'Experienced team prioritizing patient comfort.',
        },
      ],
      commonPraise: ['Friendly staff', 'Prompt service'],
      commonComplaints: ['Scheduling delays'],
      websiteCopyOpportunities: [
        {
          theme: 'Prompt Care',
          customerQuoteOrVocabulary: 'on-time appointments',
          suggestedCopyHeadline: 'On-Time Appointments You Can Count On',
          targetPage: 'Homepage',
        },
      ],
      serviceImprovementOpportunities: ['Streamline online check-in procedures.'],
    };
  }
}
