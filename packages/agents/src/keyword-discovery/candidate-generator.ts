export interface CandidateGeneratorInput {
  businessName: string;
  category?: string;
  services: string[];
  city?: string;
  websiteKeywords?: string[];
  serpTitles?: string[];
  paaQuestions?: string[];
  userSeedKeywords?: string[];
}

export function normalizeKeywordPhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove special punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateKeywordCandidates(input: CandidateGeneratorInput): string[] {
  const city = input.city || 'Austin';
  const category = input.category || (input.services[0] ? input.services[0] : 'service');
  const services = input.services.length > 0 ? input.services : [category];

  const rawCandidates = new Set<string>();

  // 1. Service + Location combinations
  for (const svc of services) {
    rawCandidates.add(`${svc} in ${city}`);
    rawCandidates.add(`best ${svc} ${city}`);
    rawCandidates.add(`${svc} near me`);
    rawCandidates.add(`affordable ${svc} ${city}`);
    rawCandidates.add(`${svc} cost ${city}`);
    rawCandidates.add(`emergency ${svc} ${city}`);
  }

  // 2. Category + Location combinations
  rawCandidates.add(`${category} in ${city}`);
  rawCandidates.add(`${category} near me`);
  rawCandidates.add(`best ${category} in ${city}`);
  rawCandidates.add(`top rated ${category} ${city}`);
  rawCandidates.add(`${category} reviews ${city}`);

  // 3. User Seed Keywords
  if (input.userSeedKeywords) {
    for (const kw of input.userSeedKeywords) {
      if (kw.trim()) {
        rawCandidates.add(kw.trim());
      }
    }
  }

  // 4. Website Analyzer Candidate Keywords
  if (input.websiteKeywords) {
    for (const kw of input.websiteKeywords) {
      if (kw.trim()) {
        rawCandidates.add(kw.trim());
      }
    }
  }

  // 5. PAA Questions (People Also Ask) - Extract core phrase
  if (input.paaQuestions) {
    for (const q of input.paaQuestions) {
      const cleaned = q
        .toLowerCase()
        .replace(/^(who is|what is|how much is|how much does|why do|where can i find)\s+/i, '')
        .replace(/\?+$/, '')
        .trim();
      if (cleaned.length > 5 && cleaned.length < 60) {
        rawCandidates.add(cleaned);
      }
    }
  }

  // 6. Clean and Deduplicate
  const normalizedList: string[] = [];
  const seen = new Set<string>();

  for (const raw of rawCandidates) {
    const norm = normalizeKeywordPhrase(raw);
    if (norm.length >= 3 && !seen.has(norm)) {
      seen.add(norm);
      normalizedList.push(norm);
    }
  }

  return normalizedList;
}
