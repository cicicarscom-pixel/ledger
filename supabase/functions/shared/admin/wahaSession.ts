/** waha-session için saf doğrulama yardımcıları (test edilebilir). */

/** Eşleştirme kodu için telefon: yalnız rakam, 7-15 hane (ülke koduyla, başında + ve boşluk olmadan). */
export function normalizePhoneNumber(input: unknown): string | null {
  const digits = String(input ?? '').replace(/[\s()+-]/g, '');
  return /^\d{7,15}$/.test(digits) ? digits : null;
}

/** Yalnız etkin hesaplar yeni WhatsApp oturumu açabilir / QR alabilir. Durum bilinmiyorsa (null) izin VERİLMEZ. */
export function canUseWhatsapp(accountStatus: unknown): boolean {
  return accountStatus === 'active';
}

/** Gelen mesaja bot cevabını susturur: yalnız AÇIKÇA askıda/banlı hesaplar. Veri eksikse (profil yok) bot susmaz (fail-open). */
export function isAccountBlocked(accountStatus: unknown): boolean {
  return accountStatus === 'suspended' || accountStatus === 'banned';
}
