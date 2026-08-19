export interface TaxpayerEntity {
  id: string;
  name: string;
  aliases?: string[];
}

export interface ResolveContext {
  activeTaxpayerId?: string;
  recentMentionedIds?: string[];
}

export interface ResolveResult {
  taxpayer: TaxpayerEntity | null;
  confidence: number;
  matchType: 'exact' | 'normalized' | 'alias' | 'fuzzy' | 'none';
}
