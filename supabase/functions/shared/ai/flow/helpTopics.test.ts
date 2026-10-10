import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { HELP_TOPICS, findHelpTopics } from "./helpTopics.ts";
import { FLOW_SCREENS } from "./flowUiCatalog.ts";

Deno.test("yardım kataloğu: her konunun ekranı geçerli, adımları ve anahtar kelimeleri dolu", () => {
  for (const [key, t] of Object.entries(HELP_TOPICS)) {
    assert(FLOW_SCREENS[t.screen], `${key}: bilinmeyen ekran ${t.screen}`);
    assert(t.title.length > 5, key);
    assert(t.steps.length >= 2, `${key}: en az 2 adım`);
    assert(t.keywords.length >= 3, `${key}: en az 3 anahtar kelime`);
    assertEquals(key, key.toLowerCase());
  }
});

Deno.test("yardım kataloğu: uygulamadaki HER ekranın en az bir yardım konusu var (yeni ekran eklenince buraya konu eklenmeli)", () => {
  const covered = new Set(Object.values(HELP_TOPICS).map((t) => t.screen));
  const missing = Object.keys(FLOW_SCREENS).filter((s) => !covered.has(s));
  assertEquals(missing, [], `Yardım konusu olmayan ekranlar: ${missing.join(", ")}`);
});

// Kullanıcıların gerçekten soracağı cümleler → beklenen konu (ilk 2 sonuçtan biri)
const QUESTIONS: Array<[string, string]> = [
  ["yeni takvim nasıl ekleyeceğim", "randevu_takvim_ekleme"],
  ["personel eklemek istiyorum", "randevu_takvim_ekleme"],
  ["takvimin adını değiştirmek istiyorum", "randevu_takvim_yonetimi"],
  ["düzenle butonu ne işe yarıyor takvim", "randevu_takvim_yonetimi"],
  ["randevu nasıl oluşturulur", "randevu_olusturma"],
  ["randevuyu iptal etmek istiyorum", "randevu_iptal_silme"],
  ["öğle arasını kapatmak istiyorum mola", "randevu_rezerve"],
  ["müşteri nasıl eklerim", "musteriler_liste"],
  ["müşteriye not eklemek", "musteri_detay"],
  ["hizmet fiyatlarını nerede değiştiririm", "hizmet_ayarlari"],
  ["whatsapp'ı nasıl bağlarım qr kod", "bot_whatsapp_baglama"],
  ["google drive klasörü bağla", "bot_bilgi_bankasi"],
  ["asistanın karakterini değiştir", "bot_kisilik"],
  ["asistanı nasıl kapatırım", "bot_genel"],
  ["instagram hesabımı nasıl bağlarım", "sosyal_hesap_baglama"],
  ["bağlantı koptu ne yapmalıyım", "sosyal_hesap_baglama"],
  ["post paylaşmak istiyorum", "ai_uretim_paylasim"],
  ["gönderiyi silmek istiyorum", "tum_gonderiler"],
  ["yorumlara nasıl cevap veririm", "gelen_kutusu_yorum"],
  ["mesajlara cevap yaz", "gelen_kutusu_mesaj"],
  ["en iyi paylaşım saati hangi grafikte", "analiz_genel"],
  ["gider nasıl girerim fatura fotoğrafı", "gelir_gider_girisi"],
  ["ödendi olarak nasıl işaretlerim", "odeme_takvimi"],
  ["geçen ayın gelir gider özeti", "isletmem"],
  ["muhasebeci kodunu nereye girerim", "muhasebeci_baglanti"],
  ["dili değiştirmek istiyorum", "dil_degistirme"],
  ["profil bilgilerimi güncelle vergi numarası", "profil_ayarlari"],
  ["çıkış yapmak istiyorum", "cikis_yapma"],
  ["bildirimleri nerede görürüm", "bildirimler"],
  ["bu uygulamada neler yapabilirim", "uygulama_haritasi"],
  ["anasayfada asistanım kapalı görünüyor", "anasayfa_ozet"],
  ["anasayfa arka plan resmini değiştir", "anasayfa_ozet"],
  ["yeni doktor ekleyebilir miyim", "randevu_takvim_ekleme"],
  ["haftanın hangi günü boş saat var", "randevu_gunluk_takvim"],
  ["izin günümü takvime nasıl işlerim", "randevu_rezerve"],
  ["rezervasyonu nasıl kaldırırım", "randevu_rezerve"],
  ["hizmet ekle fiyat gir", "hizmet_ayarlari"],
  ["müşteriyi nasıl ararım whatsapp", "musteri_detay"],
  ["asistan talimatı nasıl yazılır", "bot_talimat"],
  ["asistanı test etmek istiyorum canlı test", "bot_canli_test"],
  ["randevu hatırlatma nasıl açılır", "bot_randevu_ayarlari"],
  ["saat dilimi ayarı nerede", "bot_randevu_ayarlari"],
  ["test verilerini sıfırla", "bot_tehlikeli_bolge"],
  ["sosyal medya asistanı yorumlara otomatik cevap versin", "sosyal_asistan_ac_kapat"],
  ["planlı paylaşım yapmak istiyorum yarın saat 18", "ai_uretim_paylasim"],
  ["yayınlanan gönderilerimi görmek istiyorum", "tum_gonderiler"],
  ["yıldızlı değerlendirmeler nerede", "gelen_kutusu_degerlendirme"],
  ["gelen kutusunda sohbeti sil", "gelen_kutusu_mesaj"],
  ["yorumu gizlemek istiyorum", "gelen_kutusu_yorum"],
  ["takipçi büyümesi grafiği", "analiz_genel"],
  ["net bakiye nerede görünür", "ai_muhasebe_genel"],
  ["gelir ekle satış gir", "gelir_gider_girisi"],
  ["vadesi geçen ödemeler", "odeme_takvimi"],
  ["mali müşavirime bağlanmak istiyorum", "muhasebeci_baglanti"],
  ["flow ai neler yapabilir", "flow_ai_hakkinda"],
  ["telefon numaramı nerede güncellerim", "profil_ayarlari"],
];

Deno.test("yardım araması: gerçek kullanıcı cümleleri doğru konuya düşer", () => {
  const failures: string[] = [];
  for (const [q, expected] of QUESTIONS) {
    const keys = findHelpTopics(q, 2).map((m) => m.key);
    if (!keys.includes(expected)) failures.push(`"${q}" → [${keys.join(", ")}] (beklenen ${expected})`);
  }
  assertEquals(failures, [], failures.join("\n"));
});

Deno.test("yardım araması: ilgisiz soruda eşleşme yok (uydurma yok)", () => {
  assertEquals(findHelpTopics("uçak bileti").length, 0);
  assertEquals(findHelpTopics("").length, 0);
});
