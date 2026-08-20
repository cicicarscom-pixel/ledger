import { taxpayerRepository, TaxpayerEntity } from '../repositories/taxpayer.repository';
import { normalizeTurkishText } from './turkish-normalizer';

export interface ResolverResult {
  taxpayer: TaxpayerEntity;
  confidence: number;
}

/**
 * Service responsible for taking a raw user query and finding the best matching
 * Taxpayer entity connected to the current Firm context.
 */
export class TaxpayerResolver {
  
  /**
   * Resolves a query string to a list of candidate taxpayers with confidence scores.
   * @param rawQuery The raw string input from the AI or user (e.g., 'yilmazlar insaatin')
   * @param firmId The Tenant ID (Accounting Firm) to scope the search securely
   */
  public async resolve(rawQuery: string, firmId: string): Promise<ResolverResult[]> {
    if (!rawQuery || !firmId) {
      return [];
    }

    // 1. Fetch the firm's authorized taxpayers (Domain scope)
    const firmTaxpayers = await taxpayerRepository.getTaxpayersByFirmId(firmId);
    
    if (firmTaxpayers.length === 0) {
      return [];
    }

    // 2. Normalize the input query
    const normalizedQuery = normalizeTurkishText(rawQuery);
    const queryTokens = normalizedQuery.split(' ');

    const results: ResolverResult[] = [];

    // 3. Evaluate each taxpayer
    for (const taxpayer of firmTaxpayers) {
      const normalizedName = normalizeTurkishText(taxpayer.name);
      
      let confidence = 0;

      // Exact normalized match
      if (normalizedName === normalizedQuery) {
        confidence = 1.0;
      } 
      // Substring match (e.g., 'yilmaz' in 'yilmaz insaat')
      else if (normalizedName.includes(normalizedQuery)) {
        // Boost if it's the primary word (starts with it)
        confidence = normalizedName.startsWith(normalizedQuery) ? 0.90 : 0.80;
      }
      else {
        // Token-based matching (Jaccard similarity approximation)
        const nameTokens = normalizedName.split(' ');
        let matches = 0;
        
        for (const qToken of queryTokens) {
          if (nameTokens.some(nToken => nToken === qToken || nToken.includes(qToken))) {
            matches++;
          }
        }
        
        if (matches > 0) {
          confidence = (matches / Math.max(queryTokens.length, nameTokens.length)) * 0.70;
        }
      }

      if (confidence > 0) {
        results.push({ taxpayer, confidence });
      }
    }

    // 4. Sort by highest confidence descending
    return results.sort((a, b) => b.confidence - a.confidence);
  }
}

export const taxpayerResolver = new TaxpayerResolver();
