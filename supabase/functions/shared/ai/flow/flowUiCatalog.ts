/**
 * Flow AI'ın uygulamayı yönlendirebileceği ekran ve öğeler (izin listesi). Model buradaki anahtarlar dışında
 * hiçbir ekran/öğe adı üretemez; istemci (mobil eylem dağıtıcısı, FA2-1) kendi izin listesiyle ayrıca doğrular.
 * screen anahtarı → mobil uygulamadaki rota adı (flow/src ... Tab/Stack ekran adları).
 */
export const FLOW_SCREENS: Record<string, { route: string; label: string }> = {
  anasayfa: { route: 'Anasayfa', label: 'Anasayfa' },
  randevu: { route: 'RandevuMain', label: 'Randevu' },
  musteriler: { route: 'Musteriler', label: 'Müşteriler' },
  sosyal_medya: { route: 'SosyalMedyaMain', label: 'Sosyal Medya' },
  ai_uretim: { route: 'AiUretim', label: 'AI Üretim' },
  analiz: { route: 'Analiz', label: 'Analiz' },
  ai_muhasebe: { route: 'AiMuhasebeMain', label: 'AI Muhasebe' },
  odeme_takvimi: { route: 'OdemeTakvimi', label: 'Ödeme Takvimi' },
  isletmem: { route: 'Isletmem', label: 'İşletmem' },
  muhasebecim: { route: 'Muhasebecim', label: 'Muhasebecim' },
  mesajlar: { route: 'Mesajlar', label: 'Mesajlar' },
  yorumlar: { route: 'Yorumlar', label: 'Yorumlar' },
  bildirimler: { route: 'Bildirimler', label: 'Bildirimler' },
  bot_yonetimi: { route: 'BotYonetimiMain', label: 'Bot Yönetimi' },
  hizmet_ayarlari: { route: 'HizmetAyarlari', label: 'Hizmet Ayarları' },
  profil: { route: 'Profil', label: 'Profil' },
};

/**
 * Vurgulanabilir öğeler: screen → targetId listesi. targetId'ler mobilde testID olarak FA2-2'de eklenir;
 * o zamana kadar istemci bilinmeyen hedefi sessizce yok sayar.
 */
export const FLOW_HIGHLIGHT_TARGETS: Record<string, string[]> = {
  ai_uretim: ['media_picker', 'platform_selector', 'caption_input', 'share_button'],
};
