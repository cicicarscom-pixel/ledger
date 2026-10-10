/**
 * Flow AI yardım içeriği (veri dosyası). KURAL: yalnız mobil uygulamada GERÇEKTEN var olan ekran, düğme ve akışlar yazılır
 * (etiketler tr.json'daki görünen metinlerle birebir). Uygulamaya yeni ekran/düğme eklenince buraya konu eklenir;
 * helpTopics.test.ts her ekranın (FLOW_SCREENS) en az bir konusu olmasını zorunlu kılar.
 * `notes`: kullanıcının sık sorduğu ama uygulamada henüz OLMAYAN ya da sınırlı olan şeyler (model bunları uydurmaz).
 */
export interface HelpTopic {
  title: string;
  screen: string; // flowUiCatalog.FLOW_SCREENS anahtarı
  keywords: string[];
  steps: string[];
  notes?: string[];
}

export const HELP_TOPICS: Record<string, HelpTopic> = {
  // ───────────── Genel ─────────────
  uygulama_haritasi: {
    title: 'Uygulamanın bölümleri ve alt menü',
    screen: 'anasayfa',
    keywords: ['uygulama', 'menü', 'alt menü', 'nerede', 'ekran', 'bölümler', 'neler yapabilirim', 'ne yapabilir', 'özellikler', 'başlangıç', 'yardım', 'nasıl kullanılır'],
    steps: [
      'Alt menüde 5 bölüm vardır: Ai Asistan (WhatsApp asistanı, Randevu, Müşteriler, Hizmet Ayarları), Ai Muhasebe (gelir/gider, Ödeme Takvimi, İşletmem, Muhasebeci Bağlantısı), ortadaki Anasayfa, Sosyal Medya (hesaplar, Paylaşım Merkezi, Gelen Kutusu, Tüm Gönderiler) ve Analiz.',
      'Anasayfanın sol üstündeki profil resmi Profil Ayarları\'nı, sağ üstteki zil Bildirimler\'i açar.',
      'Bana ayrıca sorular sorabilir, ekranları açtırabilir, randevu özeti, sosyal medya performansı ve en iyi paylaşım saatlerini öğrenebilir, gönderi metni hazırlatabilir ve yayın onay kartı oluşturabilirsin.',
    ],
  },
  anasayfa_ozet: {
    title: 'Anasayfa: özet kartları ve hızlı geçişler',
    screen: 'anasayfa',
    keywords: ['anasayfa', 'ana sayfa', 'özet', 'dashboard', 'son hareketler', 'yaklaşan ödemeler', 'bugünkü randevular', 'yaklaşan randevular', 'tüm hesaplar', 'asistan çalışıyor', 'asistanım kapalı', 'arka plan resmi', 'kapak resmi'],
    steps: [
      'Anasayfanın üstünde asistanın durumu görünür ("Asistanın çalışıyor" / "Asistanın kapalı"); yanındaki anahtarla asistanı açıp kapatırsın.',
      '"Bugünkü Randevular" ve "Yaklaşan Randevular" bölümünde bir randevuya dokununca o günün Randevu ekranı açılır; "Tümünü gör" Randevu ekranına götürür.',
      '"Yaklaşan ödemeler" bölümü vadesi yaklaşan ödemeleri, "Son hareketler" bölümü son mesaj ve yorumları listeler.',
      'Gelir/Gider kartında bu ayın gelir-gider özeti ve son fatura görünür; "Tüm Hesaplar" kartında sosyal medya özeti (hesap yoksa "Hesap Bağla") bulunur, "Ayrıntılı analiz" Analiz ekranını açar.',
      '"Randevu Bildirimleri" bölümünde asistanın randevu raporları listelenir.',
      'Üstteki resim simgesine ya da arka plana basılı tutarak Anasayfa arka plan resmini değiştirirsin.',
    ],
  },
  profil_ayarlari: {
    title: 'Profil ve işletme bilgilerini düzenleme',
    screen: 'profil',
    keywords: ['profil', 'işletme adı', 'işletme bilgileri', 'vergi', 'vkn', 'vergi dairesi', 'adres', 'telefon numaram', 'e-posta', 'kapak resmi', 'profil resmi', 'kategori', 'bilgilerimi değiştir'],
    steps: [
      'Anasayfanın sol üstündeki profil resmine dokun; "Profil Ayarları" açılır.',
      'Yetkili Kişi Adı Soyadı, İşletme Adı, Telefon, Vergi Numarası (VKN), Vergi Dairesi, Mağaza Kategorisi ve Adres Bilgileri alanlarını doldurur; "Kapak Resmini Değiştir" ile kapak resmini seçersin.',
      '"Profili Kaydet" düğmesine basınca bilgiler kaydedilir ("Kaydedildi").',
    ],
  },
  dil_degistirme: {
    title: 'Uygulama dilini değiştirme',
    screen: 'profil',
    keywords: ['dil', 'dili değiştir', 'türkçe', 'ingilizce', 'almanca', 'language', 'sprache'],
    steps: [
      'Profil Ayarları\'nı aç (Anasayfada sol üstteki profil resmi).',
      '"Dil" bölümünden Türkçe, İngilizce ya da Almanca\'yı seç; "Cihaz Diline Göre Otomatik" seçeneği telefonun diline uyar.',
    ],
  },
  cikis_yapma: {
    title: 'Hesaptan çıkış yapma',
    screen: 'profil',
    keywords: ['çıkış', 'çıkış yap', 'oturumu kapat', 'logout', 'hesap değiştir'],
    steps: [
      'Profil Ayarları\'nı aç (Anasayfada sol üstteki profil resmi).',
      'En alttaki "Çıkış Yap" düğmesine bas.',
    ],
  },
  bildirimler: {
    title: 'Bildirimleri görme ve silme',
    screen: 'bildirimler',
    keywords: ['bildirim', 'bildirimler', 'zil', 'uyarı', 'bildirimi sil'],
    steps: [
      'Anasayfanın sağ üstündeki zil simgesine dokun; Bildirimler açılır (Gelen Kutusu\'nun "Bildirimler" sekmesiyle aynı liste).',
      'Bir bildirimi silmek için üzerinde silme seçeneğini kullan; onay penceresinde "Sil"e basarsın.',
      'Randevu bildirim raporlarını Anasayfadaki "Randevu Bildirimleri" bölümünden "Raporları Temizle" ile temizlersin (randevular ve konuşmalar silinmez).',
    ],
  },

  flow_ai_hakkinda: {
    title: 'Flow AI (bu asistan) neler yapar',
    screen: 'anasayfa',
    keywords: ['flow ai', 'sen kimsin', 'ne yaparsın', 'neler yapabilirsin', 'yardımcı', 'asistan ne yapar', 'komut', 'yeteneklerin'],
    steps: [
      'Ekrandaki "Flow AI" düğmesinden bana yazabilir ya da sesle konuşabilirsin.',
      'Uygulamada bir işin nasıl yapıldığını adım adım anlatır, istersen ilgili ekranı açarım.',
      'Randevu doluluğu, sosyal medya performansı, takipçi büyümesi ve en iyi paylaşım saatleri gibi verileri özetlerim.',
      'Gönderi metni yazar, paylaşım taslağı hazırlar ve yayın/zamanlama için onay kartı oluştururum; yayını senin onayınla yaparım.',
    ],
  },

  // ───────────── Randevu ─────────────
  randevu_gunluk_takvim: {
    title: 'Günlük randevu takvimini ve doluluğu görme',
    screen: 'randevu',
    keywords: ['randevu', 'takvim', 'doluluk', 'boş saat', 'müsait', 'müsaitlik', 'günlük müsaitlik', 'rezervasyon', 'doktor', 'gün seç', 'hangi gün', 'saat'],
    steps: [
      'Alt menüden Ai Asistan\'a gir, "Ai Randevu Yönetimi" kartına dokun (Randevu ekranı açılır).',
      'Üstteki hafta şeridinden günü seç; sağ üstteki oklarla ayı değiştirirsin.',
      '"Günlük Müsaitlik" kartında Sabah/Öğle/Akşam saat hücreleri vardır: yeşil dolu, boş çerçeveli boş saattir.',
      'Altta o günün randevu listesi görünür; takvim/personel seçicisindeki oklarla "Tümü" ya da tek bir takvimin randevularına bakarsın.',
      'Doluluk özetini bana "yarın randevular nasıl?" diye sorarak da alabilirsin.',
    ],
    notes: ['Saati geçmiş hücreler soluktur ve dokunulamaz; boş hücreye (bugün şu andan sonrası ya da ileri günler) dokununca "Randevu oluştur" / "Rezerve et" menüsü açılır. Dolu (yeşil) hücrede randevu zaten vardır; rezerveli hücrede "Rezervasyonu kaldır" çıkar.'],
  },
  randevu_olusturma: {
    title: 'Yeni randevu oluşturma',
    screen: 'randevu',
    keywords: ['randevu ekle', 'randevu oluştur', 'randevu ver', 'randevu al', 'yeni randevu', 'randevu yaz', 'randevu kaydet', 'müşteriye randevu'],
    steps: [
      'Randevu ekranını aç (Ai Asistan › Ai Randevu Yönetimi).',
      'Sağ alttaki yeşil "+" düğmesine bas ya da "Günlük Müsaitlik" kartında boş bir saat hücresine dokunup "Randevu oluştur"u seç (saat otomatik dolar).',
      '"Yeni Randevu Ekle" formunda Tarih, Saat, Müşteri Adı, Telefon Numarası, Takvim, Hizmet Tipi ve Açıklama / Not alanlarını doldur.',
      '"Randevu Oluştur"a bas.',
    ],
    notes: ['Saati geçmiş (soluk görünen) hücrelere dokunulunca menü açılmaz; yeni randevu yalnız şu andan sonraki boş saatlere ve ileri günlere oluşturulur. Geçmiş günler ve bugünün geçen saatleri tamamen soluk görünür.'],
  },
  randevu_iptal_silme: {
    title: 'Randevuyu iptal etme veya silme',
    screen: 'randevu',
    keywords: ['randevu iptal', 'randevuyu iptal', 'randevu sil', 'randevuyu sil', 'iptal et', 'randevu kaldır', 'iptal nedeni'],
    steps: [
      'Randevu ekranında günün listesinde ilgili randevu kartının sağ üstündeki üç nokta (⋮) simgesine dokun.',
      '"Randevuyu iptal et" seçersen iptal nedenini (isteğe bağlı) yazıp onaylarsın; kart "İptal edildi" rozetiyle listede kalır.',
      '"Kalıcı olarak sil" seçersen randevu tamamen silinir ve geri alınamaz; onay penceresi çıkar.',
    ],
  },
  randevu_rezerve: {
    title: 'Saati rezerve etme (mola, izin, toplantı) ve kaldırma',
    screen: 'randevu',
    keywords: ['izin günü', 'izin günümü', 'tatil', 'kapalıyım', 'çalışmıyorum', 'rezerve', 'rezervasyon', 'saat kapat', 'saati kapat', 'mola', 'izin', 'toplantı', 'bloke', 'müsait değil', 'kapalı saat'],
    steps: [
      'Randevu ekranında "Günlük Müsaitlik" kartında boş bir saat hücresine dokun ve "Rezerve et"i seç.',
      '"Saati rezerve et" penceresinde Kapsam (seçili doktor/takvim ya da tüm klinik), Süre (tek slot ya da başlangıç-bitiş), Neden (Toplantı, İzin, Mola, Diğer) ve isteğe bağlı Not\'u seç, "Kaydet"e bas.',
      'Aralıkta randevu varsa uyarı çıkar; önce o randevuları taşı ya da iptal et.',
      'Rezervasyonu kaldırmak için rezerveli saat hücresine dokunup "Rezervasyonu kaldır"ı seç.',
    ],
    notes: ['Saati geçmiş hücreler rezerve edilemez; yalnız şu andan sonraki saatler.'],
  },
  randevu_takvim_ekleme: {
    title: 'Yeni takvim / personel ekleme',
    screen: 'randevu',
    keywords: ['yeni takvim', 'takvim ekle', 'takvim ekleme', 'takvim oluştur', 'personel ekle', 'personel ekleme', 'yeni personel', 'doktor ekle', 'çalışan ekle', 'ikinci takvim', 'takvim nasıl eklenir', 'takvim nasıl ekleyeceğim'],
    steps: [
      'Randevu ekranını aç (Ai Asistan › Ai Randevu Yönetimi).',
      'Üstteki yeşil "+" düğmesine bas ("+ Yeni Ekle" ya da "+ Yeni Takvim/Personel" yazar).',
      '"Yeni Takvim" penceresinde takvim/personel adını yaz ve "Kaydet"e bas.',
      'Yeni takvim, hemen altındaki takvim seçicisinde (oklarla "Tümü" ve takvimler arasında gezilir) ve randevu formunun "Takvim" alanında çıkar.',
    ],
    notes: ['Birden fazla takvimin düzgün kullanılması için Ai Asistan ekranındaki "Personel / Çoklu Takvim Modu" ayarı açık olmalıdır.'],
  },
  randevu_takvim_yonetimi: {
    title: 'Takvim / personel adını değiştirme veya silme',
    screen: 'randevu',
    keywords: ['takvim düzenle', 'takvimi düzenle', 'takvim sil', 'takvimi sil', 'personel sil', 'personel düzenle', 'takvim adı', 'personel yönetimi', 'takvim yönetimi', 'takvim adını değiştir'],
    steps: [
      'Randevu ekranının üstündeki "Düzenle" düğmesine bas; "Takvim / Personel Yönetimi" penceresi açılır.',
      'Listede takvimin yanındaki düzenleme ile adını değiştirir ("Yeni takvim adı"), "Sil" ile takvimi kaldırırsın.',
    ],
  },
  hizmet_ayarlari: {
    title: 'Hizmetleri (randevu hizmetleri ve fiyatları) ekleme ve düzenleme',
    screen: 'hizmet_ayarlari',
    keywords: ['hizmet', 'hizmet ekle', 'hizmetler', 'fiyat', 'fiyat listesi', 'hizmet ayarları', 'hizmet sil', 'birim', 'ücret', 'tedavi', 'işlem listesi'],
    steps: [
      'Ai Asistan ekranında "Ai İşletme Hizmetleri" kartına dokun; "Hizmet Ayarları" açılır.',
      '"Hizmet Ekle" düğmesiyle (en fazla sayı sınırı vardır, düğmede "x/y" görünür) yeni satır aç; Hizmet adı, Fiyat ve birim alanlarını doldur.',
      'Mevcut hizmetler "AKTİF HİZMETLER" altında listelenir; "Düzenle" ile değiştirir, "Kaydet" ile kaydedersin.',
      'Müşteriler randevu alırken bu hizmetlerden seçer.',
    ],
  },
  musteriler_liste: {
    title: 'Müşterileri görme, arama ve müşteri ekleme',
    screen: 'musteriler',
    keywords: ['müşteri', 'müşteriler', 'müşteri ekle', 'müşteri listesi', 'müşteri ara', 'yeni müşteri', 'müşteri kaydet', 'rehber', 'telefon numarası ekle'],
    steps: [
      'Ai Asistan ekranında "Müşteriler" kartına dokun (ya da bana "müşterileri aç" de).',
      'Arama kutusuna isim ya da telefon yazarak müşteri ararsın.',
      '"Müşteri ekle" ile İsim Soyisim ve Telefon (+90 5XX ...) girip "Ekle"ye basarsın; aynı numara zaten kayıtlıysa uyarı verir.',
      'Bir müşteriye dokununca detay sayfası açılır.',
    ],
  },
  musteri_detay: {
    title: 'Müşteri detayı: arama, WhatsApp, not ve randevu geçmişi',
    screen: 'musteriler',
    keywords: ['müşteri detay', 'müşteri notu', 'not ekle', 'ara', 'whatsapp', 'müşteriyi ara', 'randevu geçmişi', 'müşteri geçmişi', 'müşteri bilgisi'],
    steps: [
      'Müşteriler listesinden bir müşteriye dokun.',
      '"WhatsApp" WhatsApp\'ta sohbet açar, "Ara" telefonu aratır, "Randevu" Randevu ekranını açar (randevuyu orada "+" ile oluşturursun).',
      '"Notlar" alanına müşteriyle ilgili not yazarsın (otomatik kaydedilir, "Kaydedildi" görünür).',
      '"Randevu Geçmişi" bölümünde Toplam, Yaklaşan, Geçmiş ve İptal sayılarını ve tüm randevularını görürsün.',
    ],
  },

  // ───────────── Ai Asistan (WhatsApp / Bot Yönetimi) ─────────────
  bot_genel: {
    title: 'Ai Asistan (WhatsApp asistanı) ekranı ve kartları',
    screen: 'bot_yonetimi',
    keywords: ['ai asistan', 'bot', 'whatsapp asistanı', 'asistanı aç', 'asistanı kapat', 'asistan', 'bot yönetimi', 'otomatik cevap', 'asistan çalışmıyor', 'asistanı durdur'],
    steps: [
      'Alt menüden "Ai Asistan"a gir.',
      'Üstteki "WhatsApp Asistanı" kartında asistanın açık/kapalı durumunu görür ve anahtarla değiştirirsin.',
      'Aşağıda sırayla: Ai Randevu Yönetimi, Ai İşletme Hizmetleri, Müşteriler kartları; Bağlı Servisler (Google Drive, WhatsApp); AI Kişiliği; Asistan Talimatı; Canlı Test ve Tehlikeli Bölge vardır.',
    ],
  },
  bot_whatsapp_baglama: {
    title: 'WhatsApp\'ı asistana bağlama',
    screen: 'bot_yonetimi',
    keywords: ['whatsapp bağla', 'whatsapp bağlantı', 'qr', 'qr kod', 'eşleşme kodu', 'telefonla bağlan', 'whatsapp numarası', 'whatsapp koptu', 'whatsapp bağlı değil'],
    steps: [
      'Ai Asistan ekranında "Bağlı Servisler" bölümünde WhatsApp\'a dokun; "WhatsApp Bağlantısı" penceresi açılır.',
      '"QR Kod" sekmesinde ekrandaki kodu telefondaki WhatsApp › Bağlı cihazlar › Cihaz bağla ile okut.',
      'Ya da "Telefon İle Bağlan" sekmesinde numaranı (ör. 905551234567) yaz, çıkan "Eşleşme Kodunuz"u WhatsApp\'ta gir.',
      'Bağlanınca pencerede "Asistan WhatsApp\'a Bağlı" yazar.',
    ],
  },
  bot_bilgi_bankasi: {
    title: 'Bilgi Bankası: Google Drive klasörü bağlama',
    screen: 'bot_yonetimi',
    keywords: ['google drive', 'drive', 'bilgi bankası', 'klasör', 'doküman', 'asistana bilgi', 'dosya yükle', 'fiyat listesi yükle', 'asistan bilgi'],
    steps: [
      'Ai Asistan ekranında "Bağlı Servisler" bölümünde "Google Drive (Bilgi Bankası)"na dokun.',
      'Klasörü Drive\'da paylaşıma aç, klasör linkini pencereye yapıştır ve "Bağla ve Senkronize Et"e bas.',
      'Asistan o klasördeki yeni dosyaları okuyabilir. Kaldırmak için aynı pencerede "Bağlantıyı Kes".',
    ],
  },
  bot_kisilik: {
    title: 'Asistanın kişiliğini, rolünü ve üslubunu ayarlama',
    screen: 'bot_yonetimi',
    keywords: ['kişilik', 'karakter', 'üslup', 'ton', 'rol', 'işletme rolü', 'mizah', 'karakter yoğunluğu', 'asistan nasıl konuşsun', 'persona'],
    steps: [
      'Ai Asistan ekranında "AI Kişiliği" bölümüne in.',
      '"İşletme Rolü"nden rolünü seç ya da "Ekle" ile kendi rolünü yaz (en fazla 20 rol); "Rolü sil" ile kaldırırsın.',
      '"Karakter" ve "Üslup" seçimlerini yap; "Karakter Ayarları"ndan Karakter Yoğunluğu, Mizah Seviyesi ve Modern Uyarlama kaydırıcılarını ayarla.',
      'Değişiklik yapınca çıkan "Değişiklikleri Kaydet" düğmesine bas.',
    ],
  },
  bot_talimat: {
    title: 'Asistana özel talimat yazdırma',
    screen: 'bot_yonetimi',
    keywords: ['talimat', 'asistan talimatı', 'kural', 'asistana söyle', 'prompt', 'asistan davranışı'],
    steps: [
      'Ai Asistan ekranında "Asistan Talimatı" kutusuna asistanın uyması gereken kuralları yaz.',
      'Yazmaya başlayınca altta "Değişiklikleri Kaydet" düğmesi çıkar; ona basınca talimat kaydedilir.',
    ],
  },
  bot_canli_test: {
    title: 'Asistanı canlı test etme',
    screen: 'bot_yonetimi',
    keywords: ['canlı test', 'test et', 'asistanı dene', 'deneme', 'asistan test'],
    steps: [
      'Ai Asistan ekranında "Canlı Test" bölümüne mesaj yaz.',
      'Test sohbeti hafızasızdır: her mesaj asistanın ilk izlenimidir; gerçek randevu açılmaz, kimseye mesaj gitmez.',
    ],
  },
  bot_randevu_ayarlari: {
    title: 'Randevu özelliği, çoklu takvim, saat dilimi ve WhatsApp hatırlatma ayarları',
    screen: 'bot_yonetimi',
    keywords: ['randevu özelliği', 'rezervasyon özelliği', 'çoklu takvim', 'personel modu', 'saat dilimi', 'timezone', 'hatırlatma', 'randevu hatırlatma', 'whatsapp hatırlatma', 'randevuyu kapat'],
    steps: [
      'Ai Asistan ekranında randevu ayarları kartına in.',
      '"Randevu / Rezervasyon Özelliği" asistanın randevu almasını açar/kapatır; "Personel / Çoklu Takvim Modu" birden fazla takvimi açar.',
      '"Saat Dilimi (Timezone)" alanına örn. Europe/Istanbul yaz.',
      '"WhatsApp randevu hatırlatma" onaylı randevulardan yaklaşık 1 gün önce müşteriye otomatik hatırlatma gönderir (yalnız işletme sahibi değiştirebilir).',
    ],
  },
  bot_tehlikeli_bolge: {
    title: 'Test verilerini veya tüm asistan ayarlarını sıfırlama',
    screen: 'bot_yonetimi',
    keywords: ['sıfırla', 'fabrika ayarları', 'test verileri', 'tehlikeli bölge', 'temizle', 'hepsini sil', 'baştan başla'],
    steps: [
      'Ai Asistan ekranının en altında "Tehlikeli Bölge" vardır.',
      '"Test Verilerini Sıfırla" test kayıtlarını, "Fabrika Ayarlarına Sıfırla" asistan ayarlarını sıfırlar.',
      'Her ikisi de onay penceresinde yazı yazdırarak teyit ister; geri alınamaz.',
    ],
  },

  // ───────────── Sosyal Medya ─────────────
  sosyal_medya_genel: {
    title: 'Sosyal Medya ekranı ve bölümleri',
    screen: 'sosyal_medya',
    keywords: ['sosyal medya', 'sosyal medya ekranı', 'paylaşım merkezi', 'tüm gönderiler', 'gelen kutusu', 'sosyal medya asistanı'],
    steps: [
      'Alt menüden "Sosyal Medya"ya gir.',
      'Hızlı kartlar: "Tüm Gönderiler" (yayınlanan/planlanan gönderilerin listesi) ve "Gelen Kutusu" (mesaj, yorum, bildirim, değerlendirme).',
      '"Sosyal Medya Asistanı" anahtarı yapay zekânın DM ve yorumlara otomatik yanıt vermesini açar/kapatır.',
      '"Paylaşım Merkezi" kartı gönderi hazırlayıp paylaşma ekranına (AI Üretim) götürür.',
      'Altta "Yeni Hesap Bağla" ve "Eklediğiniz Hesaplarınız" bölümleri vardır.',
    ],
  },
  sosyal_hesap_baglama: {
    title: 'Sosyal medya hesabı bağlama, yeniden bağlama ve bağlantıyı kesme',
    screen: 'sosyal_medya',
    keywords: ['instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'hesap', 'hesap bağla', 'bağla', 'bağlantı', 'bağlantı koptu', 'yeniden bağlan', 'bağlantıyı kes', 'senkronize', 'hesabı kaldır', 'hesap ekle', 'platform ekle'],
    steps: [
      'Sosyal Medya ekranında "Yeni Hesap Bağla" bölümünden platformun yanındaki "Hesap Bağla"ya bas; tarayıcıda yetkilendirmeyi tamamla.',
      '"Eklediğiniz Hesaplarınız" bölümünde bağlı hesaplar "Bağlı" rozetiyle görünür; yeni hesap görünmezse "Senkronize Et"e bas.',
      'Bağlantısı kopan ya da süresi dolan hesabı "Bağlantıyı Kes" ile kaldırıp yeniden "Hesap Bağla" ile bağla.',
      '"Bağlantıyı Kes" hesabı ayırır (onay istenir).',
      'Hangi hesapların bağlı olduğunu bana da sorabilirsin.',
    ],
  },
  sosyal_asistan_ac_kapat: {
    title: 'Sosyal medya asistanını (DM/yorum yanıtı) açma ve kapatma',
    screen: 'sosyal_medya',
    keywords: ['sosyal medya asistanı yorum', 'yorumlara otomatik', 'otomatik yorum', 'dm ve yorum', 'sosyal medya asistanı', 'yorumlara yanıt', 'dm yanıt', 'otomatik yanıt', 'asistanı kapat', 'yapay zeka yanıt versin'],
    steps: [
      'Sosyal Medya ekranında "Sosyal Medya Asistanı" kartındaki anahtarı aç ya da kapat.',
      'Ana asistan (Anasayfa/Ai Asistan) kapalıysa bu anahtar da pasif kalır; önce onu aç.',
    ],
  },
  ai_uretim_paylasim: {
    title: 'AI Üretim ile gönderi hazırlayıp paylaşma',
    screen: 'ai_uretim',
    keywords: ['paylaş', 'gönderi', 'post', 'içerik', 'ai üretim', 'metin', 'caption', 'yayınla', 'gönderi at', 'paylaşım yap', 'paylaşım merkezi', 'zamanla', 'planla', 'tweet', 'story', 'hikaye'],
    steps: [
      'AI Üretim ekranını aç (Sosyal Medya ekranındaki "Paylaşım Merkezi" kartından da ulaşılır).',
      'Paylaşmak istediğin medyayı (fotoğraf/video) seç; dokununca galeri açılır.',
      'Paylaşacağın platformları "Bağlantılı Hesaplar (Platformlar)" bölümünden seç; seçtiğin her platformun kendi ayar formu açılır.',
      'Gönderi metnini "İçerik Metni" alanına yaz ya da AI sohbet satırından metin ürettir (AI metni yalnız fotoğraf/reklam görselleri için; videoda metni kendin yaz).',
      '"Yayınlama" bölümünde "Şimdi" ya da "Planlı" (tarih ve saat) seç.',
      '"Seçili Platformlarda Paylaş" düğmesine kendin basarsın; paylaşımı senin yerine ben yapmam (yayın isteğini bana yazarsan onay kartı hazırlarım).',
    ],
  },
  tum_gonderiler: {
    title: 'Tüm Gönderiler: gönderi listesi, filtreler ve silme',
    screen: 'sosyal_medya',
    keywords: ['tüm gönderiler', 'gönderilerim', 'yayınlanan', 'planlanan', 'hatalı gönderi', 'gönderi sil', 'gönderiyi sil', 'paylaşım geçmişi', 'gönderi listesi'],
    steps: [
      'Sosyal Medya ekranında "Tüm Gönderiler" kartına dokun.',
      'Üstteki filtrelerle Tümü, Planlanan, Yayınlanan ve Hatalı gönderileri ayır.',
      'Silmek için kartın sağındaki çöp kutusuna bas ve iki seçenekten birini seç: "Sadece Workigom Flow\'dan sil" (platformda yayında kalır) ya da "Platformlardan ve Workigom Flow\'dan sil".',
      'Instagram API ile silmeyi desteklemediğinden Instagram\'dan manuel silmek gerekebilir.',
    ],
  },

  // ───────────── Gelen Kutusu ─────────────
  gelen_kutusu_genel: {
    title: 'Gelen Kutusu: sekmeler ve yenileme',
    screen: 'mesajlar',
    keywords: ['gelen kutusu', 'inbox', 'mesajlar', 'yorumlar', 'değerlendirmeler', 'yenile', 'senkron', 'sekme'],
    steps: [
      'Sosyal Medya ekranında "Gelen Kutusu" kartına dokun.',
      'Üstte dört sekme vardır: Mesajlar, Yorumlar, Bildirimler, Değerlendirmeler.',
      'Sağ üstteki yenile simgesi listeleri günceller.',
      'Mesajları ya da yorumları toplu silmek için bir öğeye uzun bas; seçim modunda "Tümünü Seç" ve "Sil" çıkar.',
    ],
  },
  gelen_kutusu_mesaj: {
    title: 'Mesajlara yanıt verme ve sohbet silme',
    screen: 'mesajlar',
    keywords: ['mesaj', 'dm', 'mesaja cevap', 'cevap yaz', 'yanıtla', 'sohbet', 'mesaj gönder', 'mesaj sil', 'sohbeti sil', 'okunmamış', 'yeni sohbet'],
    steps: [
      'Gelen Kutusu › Mesajlar sekmesinde bir sohbete dokun.',
      'Alttaki "Mesaj yazın..." alanına yazıp gönder; mesaja uzun basarak silebilirsin.',
      'Sohbetleri silmek için listede bir sohbete uzun bas, seç ve "Sil"e bas (uygulamandan kaldırılır).',
    ],
    notes: ['"Yeni sohbet başlatma" ve konuşmayı arşivleme henüz çalışmıyor; mesaj düzenleme yalnız Telegram\'da çalışır.'],
  },
  gelen_kutusu_yorum: {
    title: 'Yorumlara yanıt verme, gizleme, beğenme ve özel mesaj',
    screen: 'yorumlar',
    keywords: ['yorum', 'yoruma cevap', 'yorum yanıtla', 'yorumu gizle', 'yorum sil', 'yorum beğen', 'özel mesaj', 'yorumu sil', 'yorumları gör'],
    steps: [
      'Gelen Kutusu › Yorumlar sekmesinde gönderinin kartındaki "Yorumları Gör"e dokun; gönderinin yorum sayfası açılır.',
      'Bir yorumun altında kalp ile beğenir, göz simgesiyle gizler, çöp kutusuyla silersin.',
      '"Yanıtla" ile herkese açık cevap yazar, özel mesaj seçeneğiyle yorumu yapana DM gönderirsin.',
      'Alttaki alana yazarak gönderiye yeni yorum da bırakabilirsin.',
    ],
  },
  gelen_kutusu_degerlendirme: {
    title: 'Değerlendirmeler (yıldızlı yorumlar)',
    screen: 'mesajlar',
    keywords: ['değerlendirme', 'değerlendirmeler', 'yıldız', 'puan', 'google yorum', 'review'],
    steps: [
      'Gelen Kutusu › Değerlendirmeler sekmesini aç.',
      'Bağlı hesaplarındaki yıldızlı değerlendirmeler burada listelenir; hiç yoksa "Henüz değerlendirme bulunmuyor" yazar.',
    ],
  },

  // ───────────── Analiz ─────────────
  analiz_genel: {
    title: 'Analiz: gönderi ve gelen mesaj istatistikleri',
    screen: 'analiz',
    keywords: ['en iyi paylaşım saati', 'paylaşım saati', 'en iyi saat', 'en iyi zaman', 'hangi saatte paylaş', 'analiz', 'istatistik', 'takipçi', 'etkileşim', 'erişim', 'performans', 'en iyi gönderi', 'en iyi zaman', 'grafik', 'platform seç', 'zaman aralığı', 'büyüme', 'rapor'],
    steps: [
      'Alt menüden "Analiz"e gir.',
      'Üstte "Gönderi Analizi" ve "Gelen Mesaj Analizi" sekmeleri, platform seçici ("Tüm platformlar" ya da tek platform) ve zaman aralığı (Son 7/30/90 gün, Son 1 yıl) vardır.',
      'Gönderi Analizi: Toplam Gönderi/Yorum/Takipçi, Ort. Etkileşim Oranı, Takipçi Büyümesi, En İyi Gönderi, En İyi Performanslı Gönderiler, Platform Kırılımı, Paylaşım İçin En İyi Zamanlar, İçerik Ömrü ve Paylaşım Sıklığı kartları.',
      'Gelen Mesaj Analizi: Alınan, Gönderilen, Okunan mesajlar ve Ortalama Yanıt süresi.',
      'Kısa bir özet için bana "geçen ay performansım nasıl?" ya da "en iyi paylaşım saati?" diye sorabilirsin.',
    ],
  },

  // ───────────── Ai Muhasebe ─────────────
  ai_muhasebe_genel: {
    title: 'Ai Muhasebe ekranı: bakiye, gelir/gider ve menü',
    screen: 'ai_muhasebe',
    keywords: ['ai muhasebe', 'muhasebe', 'net bakiye', 'bakiye', 'alacak', 'borç', 'bu ay gelir', 'bu ay gider', 'hesaplarım', 'para durumu'],
    steps: [
      'Alt menüden "Ai Muhasebe"ye gir.',
      'Üstte NET BAKİYE, Bu Ay Gelir, Bu Ay Gider, Alacak ve Borç özetini görürsün.',
      '"Gelir Gir" ve "Gider Gir" düğmeleriyle kayıt eklersin.',
      'Menüde: "İşletmem (Geçmiş Dönemler)", "Ödeme Takvimi", "AI Asistan" (muhasebe raporu sohbeti) ve "Muhasebeci Bağlantısı" bulunur.',
    ],
  },
  gelir_gider_girisi: {
    title: 'Gelir veya gider kaydı girme (yazarak, fatura/fiş fotoğrafı veya PDF ile)',
    screen: 'ai_muhasebe',
    keywords: ['gelir gir', 'gider gir', 'gelir ekle', 'gider ekle', 'fatura yükle', 'fatura tara', 'fiş', 'fatura', 'harcama', 'masraf', 'satış gir', 'kayıt ekle', 'fotoğraf çek', 'pdf fatura', 'veri girişi'],
    steps: [
      'Ai Muhasebe ekranında "Gelir Gir" ya da "Gider Gir"e bas; yapay zekâ sohbeti açılır.',
      'Tutarı ve açıklamayı yazabilir ya da ataş menüsünden fatura/fişi kameradan çekebilir, galeriden seçebilir veya PDF yükleyebilirsin.',
      'Yapay zekâ tutar, tarih ve kalemleri çıkarıp kaydı oluşturur ve sonucu sohbette yazar; kayıt Ai Muhasebe\'ye ve Ödeme Takvimi\'ne düşer.',
      'Ödeme Takvimi\'nde bir günün "+ Gelir ekle" / "+ Gider ekle" bağlantısıyla da aynı sohbet o tarih için açılır.',
    ],
  },
  odeme_takvimi: {
    title: 'Ödeme Takvimi: vade takibi, ödendi/bekliyor işaretleme, kayıt ekleme',
    screen: 'odeme_takvimi',
    keywords: ['ödeme', 'ödeme takvimi', 'vade', 'fatura', 'borç', 'alacak', 'takvim', 'ödendi', 'geciken', 'bekliyor', 'ödenmedi', 'taksit', 'ödeme ekle'],
    steps: [
      'Ai Muhasebe ekranından "Ödeme Takvimi"ni aç.',
      'Üstteki oklarla ayı değiştir; üstte Toplam Gelir, Toplam Gider, Net ve Geciken özeti vardır.',
      'Günlerde Gelirler ve Giderler listelenir; "+N kayıt daha" ile genişletir, "Daha az göster" ile kapatırsın.',
      'Bir kayda dokunup "Ödendi olarak işaretle" ya da "Bekliyor olarak işaretle"yi seçersin.',
      'Günün altındaki "+ Gelir ekle" / "+ Gider ekle" o tarih için yeni kayıt açar.',
    ],
  },
  isletmem: {
    title: 'İşletmem: geçmiş dönemler, gelir/gider/fatura listesi, akıllı analiz',
    screen: 'isletmem',
    keywords: ['işletmem', 'geçmiş dönem', 'geçen ay', 'aylık özet', 'toplam bakiye', 'akıllı analiz', 'faturalar', 'ay seç', 'önceki ay'],
    steps: [
      'Ai Muhasebe ekranında menüden "İşletmem (Geçmiş Dönemler)"i aç.',
      'Üstteki ay düğmelerinden dönemi seç; Toplam Bakiye, Gelirler ve Giderler kartları o aya göre değişir.',
      '"Gelirler", "Giderler" ve "Faturalar" sekmeleriyle kayıtları süz; ödeme durumu rozetleri Ödendi, Beklemede, Kısmi, Ödenmedi şeklindedir.',
      'En altta "Akıllı Analiz" kartı yapay zekâ yorumunu gösterir (hazır değilse "Analiz alınamadı" yazar).',
    ],
  },
  muhasebeci_baglanti: {
    title: 'Muhasebeci (mali müşavir) bağlantısı: kodla bağlanma, isteği geri çekme, kesme',
    screen: 'muhasebecim',
    keywords: ['muhasebeci', 'mali müşavir', 'müşavir', 'muhasebeci kodu', 'davet kodu', 'muhasebeciye bağlan', 'bağlantıyı kes', 'faturaları paylaş', 'belge paylaş', 'muhasebecim'],
    steps: [
      'Ai Muhasebe ekranında menüden "Muhasebeci Bağlantısı"nı aç.',
      '"Muhasebeci Kodunu Gir" kartına muhasebecinin verdiği kodu (ör. ABC-12345) yaz ve "Doğrula"ya bas; kod doğrulanınca firma adı çıkar.',
      '"Bağlan"a basınca istek gönderilir ve muhasebeci onaylayana kadar "Bağlantı isteğiniz gönderildi" görünür; "İsteği geri çek" ile vazgeçersin.',
      'Bağlıyken "Hızlı Eylemler"den Faturalar, Belgeleri Gör ve Mesaj Gönder\'i kullanırsın; "Bağlantıyı kes" bağlantıyı kaldırır (onay istenir).',
      'Çok sayıda hatalı kod denersen biraz beklemen istenir.',
    ],
  },
  ai_muhasebe_asistan: {
    title: 'Muhasebe raporu ve soruları için AI Asistan',
    screen: 'ai_muhasebe',
    keywords: ['muhasebe raporu', 'rapor al', 'gelir gider raporu', 'ai asistan muhasebe', 'finans özeti', 'harcama analizi', 'muhasebe sor'],
    steps: [
      'Ai Muhasebe ekranında menüden "AI Asistan"ı aç; muhasebe raporu sohbeti başlar ve işletmenin gelir-gider durumunu sorabilirsin.',
      'Kısa finans özetleri için bana da sorabilirsin.',
    ],
  },
};

/** Çok genel sözcükler: tek başına eşleşme sayılmaz. */
const STOP = new Set(['nasil', 'nasıl', 'yapilir', 'yapabilirim', 'istiyorum', 'icin', 'için', 'ile', 'ben', 'bir', 'mi', 'mu', 'nedir', 'nerede', 'nereden', 'gor', 'goruyorum', 'gosterir', 'ekran', 'yeni', 'bana', 'bunu', 'bilmiyorum', 'lutfen', 'var', 'yok', 'olur', 'edebilirim', 'etmek']);

/** Küçük harfe ve Türkçe karakterlerden bağımsız (ö→o, ş→s, ı→i ...) karşılaştırma için. */
export function fold(text: string): string {
  return text.toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9_ ]+/g, ' ').replace(/\s+/g, ' ')
    .trim();
}

const stem = (w: string) => (w.length > 4 ? w.slice(0, 4 + (w.length > 7 ? 1 : 0)) : w);

function scoreTopic(qFolded: string, qTokens: string[], t: HelpTopic): number {
  let score = 0;
  for (const kw of t.keywords) {
    const k = fold(kw);
    if (!k) continue;
    if (qFolded.includes(k)) { score += k.includes(' ') ? 4 : 2; continue; } // tam ifade / sözcük
    const kTokens = k.split(' ').filter((x) => x.length >= 3 && !STOP.has(x));
    if (kTokens.length > 1) {
      // çok sözcüklü anahtarın tüm sözcükleri (ek almış hâlleriyle) soruda geçiyorsa
      const all = kTokens.every((kt) => qTokens.some((qt) => qt.startsWith(stem(kt)) && qt.length >= 3));
      if (all) score += 3;
    } else if (kTokens.length === 1 && kTokens[0].length >= 4 && qTokens.some((qt) => qt.startsWith(stem(kTokens[0])))) {
      score += 1;
    }
  }
  const titleTokens = fold(t.title).split(' ').filter((x) => x.length >= 5 && !STOP.has(x));
  for (const tt of titleTokens) if (qTokens.some((qt) => qt.startsWith(stem(tt)))) score += 1;
  return score;
}

/** Soruya en uygun (en fazla 3) yardım konusunu puanına göre döndürür. */
export function findHelpTopics(query: string, limit = 3): Array<{ key: string; topic: HelpTopic; score: number }> {
  const q = fold(query);
  if (!q) return [];
  if (HELP_TOPICS[q]) return [{ key: q, topic: HELP_TOPICS[q], score: 99 }];
  const qTokens = q.split(' ').filter((x) => x.length >= 3 && !STOP.has(x));
  return Object.entries(HELP_TOPICS)
    .map(([key, topic]) => ({ key, topic, score: scoreTopic(q, qTokens, topic) }))
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findHelpTopic(query: string): { key: string; topic: HelpTopic } | null {
  const r = findHelpTopics(query, 1)[0];
  return r ? { key: r.key, topic: r.topic } : null;
}
