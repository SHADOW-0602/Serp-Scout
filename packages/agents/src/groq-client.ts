import Groq from 'groq-sdk';

let groqInstance: Groq | null = null;

export function getGroqClient(apiKey?: string): Groq {
  if (groqInstance) return groqInstance;
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('GROQ_API_KEY is not configured');
  }
  groqInstance = new Groq({ apiKey: key });
  return groqInstance;
}

export const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
