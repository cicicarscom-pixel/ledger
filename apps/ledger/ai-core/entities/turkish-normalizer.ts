export function normalizeTurkish(text: string): string {
  if (!text) return '';

  // 1. Lowercase handling for Turkish chars
  let normalized = text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase();

  // 2. Remove apostrophe and following suffixes (e.g. 'ın, 'a, 'tan)
  normalized = normalized.replace(/'[a-zıiüuöoşçğ]*/g, '');

  // 3. Convert Turkish chars to ASCII for standard comparison
  normalized = normalized
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

  // 4. Whitespace trimming
  return normalized.replace(/\s+/g, ' ').trim();
}
