/**
 * Normalizes Turkish text to a base ASCII representation,
 * removes punctuation, and strips common grammatical suffixes
 * to prepare for robust entity matching.
 */
export function normalizeTurkishText(text: string): string {
  if (!text) return '';

  // 1. Lowercase
  let normalized = text.toLowerCase();

  // 2. Map Turkish characters to ASCII equivalents
  const charMap: Record<string, string> = {
    'ç': 'c',
    'ğ': 'g',
    'ı': 'i',
    'ö': 'o',
    'ş': 's',
    'ü': 'u',
    'â': 'a',
    'î': 'i',
    'û': 'u'
  };

  normalized = normalized.replace(/[çğıöşüâîû]/g, char => charMap[char] || char);

  // 3. Remove punctuation and extra spaces
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_~()]/g, ' ');
  normalized = normalized.replace(/\s{2,}/g, ' ').trim();

  // 4. Strip common Turkish suffixes (simplified stemming for business names)
  // We use regex to match words ending with these suffixes. 
  // We use a progressive approach: longest suffixes first to avoid partial stripping.
  
  // Note: Business names (e.g., 'Yilmaz Insaat') might get false positives if we are too aggressive.
  // We specifically target possessive and case suffixes attached with apostrophes (already removed by punctuation step)
  // or just directly appended if typed poorly (e.g. "yilmaza", "insaatin").
  
  const suffixes = [
    '(n)?[ıi]n', '(n)?[uü]n',       // Genitive (ın, in, un, ün, nın, nin, nun, nün)
    '(y)?[ae]',                      // Dative (a, e, ya, ye)
    'd[ae]n', 't[ae]n',              // Ablative (dan, den, tan, ten)
    'd[ae]', 't[ae]',                // Locative (da, de, ta, te)
    '(y)?[ıiuü]',                    // Accusative (ı, i, u, ü, yı, yi, yu, yü)
    'l[ae]r'                         // Plural (lar, ler)
  ];

  // We only strip suffixes if the word length remains > 3 to avoid destroying short words.
  const words = normalized.split(' ').map(word => {
    let currentWord = word;
    let modified = true;
    
    // Iteratively strip suffixes until no more match
    while (modified && currentWord.length > 3) {
      modified = false;
      for (const suffix of suffixes) {
        const regex = new RegExp(`^(.*?)${suffix}$`, 'i');
        const match = currentWord.match(regex);
        // Only strip if the remaining stem is at least 3 chars
        if (match && match[1].length >= 3) {
          currentWord = match[1];
          modified = true;
          break; // restart the loop with the stripped word
        }
      }
    }
    return currentWord;
  });

  return words.join(' ').trim();
}
