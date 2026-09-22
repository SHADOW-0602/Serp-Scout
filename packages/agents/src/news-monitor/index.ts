import { NewsSignal } from '@serp-scout/types';
import { getGroqClient, DEFAULT_GROQ_MODEL } from '../groq-client.js';

export interface RawNewsArticle {
  title: string;
  source: string;
  url: string;
  snippet?: string;
  date?: string;
}

export interface NewsMonitorInput {
  business: {
    name: string;
    services: string[];
    city?: string;
  };
  articles: RawNewsArticle[];
  apiKey?: string;
}

export async function analyzeNewsSignals(input: NewsMonitorInput): Promise<NewsSignal[]> {
  const { business, articles, apiKey } = input;

  if (articles.length === 0) {
    return [];
  }

  try {
    const groq = getGroqClient(apiKey);

    const prompt = `You are a market intelligence analyst evaluating local and industry news articles for a small business.

Target Business: "${business.name}" in "${business.city || 'Local Area'}" (Services: ${business.services.join(', ')})

News Articles retrieved:
${JSON.stringify(articles.slice(0, 10), null, 2)}

Instructions:
Classify each article into one of these 6 categories:
- "opportunity": positive market opening, grant, event, demand surge, or new partnership chance
- "competitive_activity": a competitor expanding, hiring, rebranding, or launching a service
- "market_trend": broader industry consumer behavior, technological shift, or adoption trend
- "reputation_risk": controversy, consumer warning, scam alerts in the industry, or local risk
- "regulatory": changes in compliance, licensing, healthcare rules, or local ordinances
- "low_relevance": general news unrelated to the business or its target local market

Provide a 1-sentence actionable summary of what this signal means for "${business.name}".

Respond ONLY with valid JSON in this format:
{
  "signals": [
    {
      "headline": "...",
      "source": "...",
      "url": "...",
      "date": "...",
      "category": "opportunity",
      "summary": "..."
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a market intelligence news analyst. Return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const rawSignals: any[] = Array.isArray(parsed.signals) ? parsed.signals : [];

    const validCategories = [
      'opportunity',
      'competitive_activity',
      'market_trend',
      'reputation_risk',
      'regulatory',
      'low_relevance',
    ] as const;

    return rawSignals.map((s, idx) => {
      const orig = articles[idx] || {};
      const cat = validCategories.includes(s.category) ? s.category : 'market_trend';

      return {
        headline: s.headline || orig.title || 'Market Update',
        source: s.source || orig.source || 'News',
        url: s.url || orig.url || '',
        date: s.date || orig.date || undefined,
        category: cat,
        summary: s.summary || orig.snippet || 'Industry news signal.',
      };
    });
  } catch (err) {
    console.error('News analysis failed:', err);
    return articles.map((a) => ({
      headline: a.title,
      source: a.source,
      url: a.url,
      date: a.date,
      category: 'market_trend',
      summary: a.snippet || 'Market news signal.',
    }));
  }
}
