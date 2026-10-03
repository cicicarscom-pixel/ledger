/** Flow AI yardım içeriği (veri dosyası; FA2-2'de rehber moduyla genişler). Yalnız doğrulanmış akışlar yazılır. */
export interface HelpTopic {
  title: string;
  screen: string; // flowUiCatalog.FLOW_SCREENS anahtarı
  keywords: string[];
  steps: string[];
}

export const HELP_TOPICS: Record<string, HelpTopic> = {
  ai_uretim_paylasim: {
    title: 'AI Üretim ile gönderi hazırlayıp paylaşma',
    screen: 'ai_uretim',
    keywords: ['paylaş', 'gönderi', 'post', 'içerik', 'ai üretim', 'metin', 'caption', 'yayınla'],
    steps: [
      'AI Üretim ekranını aç.',
      'Paylaşmak istediğin medyayı (fotoğraf/video) seç.',
      'Paylaşacağın platformları seç.',
      'Gönderi metnini yazdır veya kendin yaz.',
      'Paylaş düğmesine kendin basarsın; paylaşımı senin yerine ben yapmam.',
    ],
  },
  randevu_gunluk_takvim: {
    title: 'Günlük randevu takvimini ve doluluğu görme',
    screen: 'randevu',
    keywords: ['randevu', 'takvim', 'doluluk', 'boş saat', 'rezervasyon', 'doktor'],
    steps: [
      'Randevu ekranını aç.',
      'Gün ızgarasında dolu, boş ve rezerve saatleri görürsün.',
      'Doluluk özeti için bana "bugün randevular nasıl?" diye sorabilirsin.',
    ],
  },
  odeme_takvimi: {
    title: 'Ödeme takvimi',
    screen: 'odeme_takvimi',
    keywords: ['ödeme', 'vade', 'fatura', 'borç', 'alacak', 'takvim'],
    steps: [
      'Ödeme Takvimi ekranını aç.',
      'Vadesi gelen ve geçen ödemeleri tarih sırasıyla görürsün.',
    ],
  },
  sosyal_hesap_baglama: {
    title: 'Sosyal medya hesaplarını görme',
    screen: 'sosyal_medya',
    keywords: ['instagram', 'facebook', 'hesap', 'bağla', 'bağlantı', 'sosyal medya'],
    steps: [
      'Sosyal Medya ekranını aç.',
      'Bağlı hesaplarını orada görürsün.',
      'Hangi hesapların bağlı olduğunu bana da sorabilirsin.',
    ],
  },
};

/** Küçük harfe ve Türkçe karakterlerden bağımsız (ö→o, ş→s, ı→i ...) karşılaştırma için. */
function fold(text: string): string {
  return text.toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .trim();
}

export function findHelpTopic(query: string): { key: string; topic: HelpTopic } | null {
  const q = fold(query);
  if (!q) return null;
  if (HELP_TOPICS[q]) return { key: q, topic: HELP_TOPICS[q] };
  let best: { key: string; score: number } | null = null;
  for (const [key, t] of Object.entries(HELP_TOPICS)) {
    const score = t.keywords.filter((k) => q.includes(fold(k))).length;
    if (score > 0 && (!best || score > best.score)) best = { key, score };
  }
  return best ? { key: best.key, topic: HELP_TOPICS[best.key] } : null;
}
