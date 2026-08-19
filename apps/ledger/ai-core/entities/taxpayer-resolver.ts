import { TaxpayerEntity, ResolveContext, ResolveResult } from './entity.types';
import { normalizeTurkish } from './turkish-normalizer';

// Basic Levenshtein distance based similarity (0 to 1)
function getSimilarity(s1: string, s2: string): number {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) { longer = s2; shorter = s1; }
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  const costs = new Array();
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (longer.charAt(i - 1) !== shorter.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longerLength - costs[shorter.length]) / parseFloat(longerLength.toString());
}

export class TaxpayerResolver {
  constructor(private fetchCandidates: (query: string) => Promise<TaxpayerEntity[]>) {}

  async resolve(rawQuery: string, context?: ResolveContext): Promise<ResolveResult> {
    const candidates = await this.fetchCandidates(rawQuery);
    if (candidates.length === 0) {
      return { taxpayer: null, confidence: 0, matchType: 'none' };
    }

    const normalizedQuery = normalizeTurkish(rawQuery);
    let bestMatch: ResolveResult = { taxpayer: null, confidence: 0, matchType: 'none' };

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeTurkish(candidate.name);

      // 1. Exact Match
      if (candidate.name.toLowerCase() === rawQuery.toLowerCase()) {
        return { taxpayer: candidate, confidence: 1.0, matchType: 'exact' };
      }

      // 2. Normalized Match
      if (normalizedCandidate === normalizedQuery) {
        return { taxpayer: candidate, confidence: 0.95, matchType: 'normalized' };
      }

      // 3. Alias Match
      if (candidate.aliases) {
        for (const alias of candidate.aliases) {
          if (normalizeTurkish(alias) === normalizedQuery) {
            return { taxpayer: candidate, confidence: 0.90, matchType: 'alias' };
          }
        }
      }

      // 4. Fuzzy & Context-Aware Ranking
      const nameSimilarity = getSimilarity(normalizedCandidate, normalizedQuery);
      let score = nameSimilarity;

      // Sinyal eklemeleri (Context Weighting)
      if (context?.activeTaxpayerId === candidate.id) {
        score += 0.15; // Mükellef şu an ekranda açıksa bonus
      }
      if (context?.recentMentionedIds?.includes(candidate.id)) {
        score += 0.05; // Yakın zamanda bahsedildiyse bonus
      }

      // Fuzzy match'in 'exact' veya 'normalized' değerini (0.90+) aşmasını engellemek için sınırla
      const finalScore = Math.min(score, 0.89);

      if (finalScore > bestMatch.confidence) {
        bestMatch = {
          taxpayer: candidate,
          confidence: finalScore,
          matchType: 'fuzzy'
        };
      }
    }

    return bestMatch;
  }
}
