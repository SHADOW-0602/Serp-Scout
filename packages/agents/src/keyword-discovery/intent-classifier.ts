import { SearchIntent } from '@serp-scout/types';
import { getGroqClient, DEFAULT_GROQ_MODEL } from '../groq-client.js';

export interface KeywordIntentResult {
  intent: SearchIntent;
  businessRelevance: number; // 0 - 100
  commercialScore: number;    // 0 - 100
  localFit: number;           // 0 - 100
  reasoning: string;
}

export interface BusinessIntentContext {
  businessName: string;
  category: string;
  services: string[];
  city?: string;
}

// Fast heuristic classifier before calling LLM
export function classifyIntentHeuristic(phrase: string, city?: string): SearchIntent | null {
  const lower = phrase.toLowerCase();
  
  if (lower.includes('near me') || (city && lower.includes(city.toLowerCase()))) {
    return 'local';
  }
  if (lower.includes('vs') || lower.includes('versus') || lower.includes('alternative') || lower.includes('compared to')) {
    return 'comparison';
  }
  if (lower.includes('how to') || lower.includes('what is') || lower.includes('why do') || lower.includes('guide')) {
    return 'informational';
  }
  if (lower.includes('emergency') || lower.includes('broken') || lower.includes('pain') || lower.includes('fix') || lower.includes('repair')) {
    return 'problem-based';
  }
  if (lower.includes('buy') || lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || lower.includes('order')) {
    return 'transactional';
  }
  if (lower.includes('cost') || lower.includes('price') || lower.includes('pricing') || lower.includes('affordable') || lower.includes('best')) {
    return 'commercial';
  }
  
  return null;
}

export async function classifyKeywordIntent(
  phrase: string,
  context: BusinessIntentContext,
  apiKey?: string
): Promise<KeywordIntentResult> {
  const heuristicIntent = classifyIntentHeuristic(phrase, context.city);
  
  // Calculate basic local fit heuristic
  const hasCityMatch = context.city && phrase.toLowerCase().includes(context.city.toLowerCase());
  const hasNearMe = phrase.toLowerCase().includes('near me');
  const baseLocalFit = hasCityMatch ? 90 : hasNearMe ? 80 : 30;

  // Calculate service match
  const hasServiceMatch = context.services.some(svc => phrase.toLowerCase().includes(svc.toLowerCase()));
  const baseRelevance = hasServiceMatch ? 85 : 50;

  try {
    const groq = getGroqClient(apiKey);

    const prompt = `You are an expert SEO and search intent analyst evaluating a search query for a local business.

Business Context:
- Name: "${context.businessName}"
- Category: "${context.category}"
- Services: ${JSON.stringify(context.services)}
- Location: "${context.city || 'Local'}"

Search Query to evaluate: "${phrase}"

Evaluate:
1. Primary Intent: Choose exactly one of: ["informational", "commercial", "transactional", "local", "navigational", "comparison", "problem-based"]
2. Business Relevance (0 to 100): How relevant is this query to what this business sells/offers?
3. Commercial Intent (0 to 100): How close is the searcher to spending money or hiring a service?
4. Local Fit (0 to 100): Is this seeking a provider in this specific local market?
5. Rationale: 1 short sentence explaining why.

Respond with ONLY valid JSON in this format:
{
  "intent": "local",
  "businessRelevance": 90,
  "commercialScore": 85,
  "localFit": 95,
  "reasoning": "High commercial local intent looking for emergency dental services in Austin."
}`;

    const completion = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an AI SEO search intent analyst. Always respond in strict JSON.',
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

    const validIntents: SearchIntent[] = [
      'informational',
      'commercial',
      'transactional',
      'local',
      'navigational',
      'comparison',
      'problem-based',
    ];

    const intent = validIntents.includes(parsed.intent)
      ? parsed.intent
      : heuristicIntent || 'commercial';

    return {
      intent,
      businessRelevance: Math.min(100, Math.max(0, Number(parsed.businessRelevance) || baseRelevance)),
      commercialScore: Math.min(100, Math.max(0, Number(parsed.commercialScore) || 60)),
      localFit: Math.min(100, Math.max(0, Number(parsed.localFit) || baseLocalFit)),
      reasoning: parsed.reasoning || `Classified as ${intent} search intent.`,
    };
  } catch (err) {
    console.warn(`AI classification failed for "${phrase}", falling back to heuristics:`, err);
    return {
      intent: heuristicIntent || 'commercial',
      businessRelevance: baseRelevance,
      commercialScore: heuristicIntent === 'transactional' ? 90 : heuristicIntent === 'commercial' ? 80 : 50,
      localFit: baseLocalFit,
      reasoning: `Heuristic classification as ${heuristicIntent || 'commercial'}.`,
    };
  }
}
