'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

export function HowToAddServerGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm mb-8 overflow-hidden">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-surface-hover transition-colors"
      >
        <h2 className="text-lg font-medium">Yeni sunucu nasıl eklenir?</h2>
        {isOpen ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
      </button>
      
      {isOpen && (
        <div className="p-6 border-t border-border space-y-6 text-sm text-text-secondary">
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-text mb-1">Adım 1 — Supabase&apos;de Secret&apos;ları Üretin</h3>
              <p>Supabase paneline gidin (Edge Functions &gt; Secrets). İki adet yeni, güvenli rastgele anahtar üretin (örneğin terminalde <code className="bg-surface-hover px-1 py-0.5 rounded text-xs text-text">openssl rand -hex 32</code> komutuyla 64 karakterlik bir dizi oluşturabilirsiniz).</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-text mb-1">Adım 2 — API Anahtarını Ekleyin</h3>
              <p>Ürettiğiniz ilk anahtarı Supabase&apos;e ekleyin. Adı: <code className="bg-surface-hover px-1 py-0.5 rounded text-xs text-text">WAHA_API_KEY_2</code> (Eğer bu eklediğiniz 2. sunucuysa sonundaki sayıyı buna göre artırın).</p>
            </div>

            <div>
              <h3 className="font-semibold text-text mb-1">Adım 3 — Webhook Anahtarını Ekleyin</h3>
              <p>Ürettiğiniz ikinci anahtarı Supabase&apos;e ekleyin. Adı: <code className="bg-surface-hover px-1 py-0.5 rounded text-xs text-text">WAHA_WEBHOOK_SECRET_2</code></p>
            </div>

            <div>
              <h3 className="font-semibold text-text mb-1">Adım 4 — Sunucuyu Kurun ve Yapılandırın</h3>
              <p>Yeni WAHA sunucunuzu kurun. API anahtarınızı yapılandırmaya dahil edin. Caddy örneği:</p>
              <div className="overflow-x-auto bg-surface-hover p-3 rounded-md mt-2 border border-border">
                <pre className="text-xs text-text"><code>{`waha2.example.com {
  reverse_proxy localhost:3000
}`}</code></pre>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-text mb-1">Adım 5 — Admin Panelinden Sunucuyu Kaydedin</h3>
              <p className="mb-2">Bu sayfadaki &quot;Yeni Sunucu Ekle&quot; formunu doldurun:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Adres</strong> → Sunucunuzun internet adresi (örnek: <code className="bg-surface-hover px-1 py-0.5 rounded text-xs">https://waha2.example.com</code>)</li>
                <li><strong>API Gizli Adı</strong> → <code className="bg-surface-hover px-1 py-0.5 rounded text-xs">WAHA_API_KEY_2</code> (2. adımdaki ad)</li>
                <li><strong>Webhook Gizli Adı</strong> → <code className="bg-surface-hover px-1 py-0.5 rounded text-xs">WAHA_WEBHOOK_SECRET_2</code> (3. adımdaki ad)</li>
                <li><strong>Sıra (fill_order)</strong> → kendiliğinden gelen sayıyı bırakın (mevcut en büyük sıra + 1). Her sunucunun sırası farklı olmalı.</li>
                <li><strong>Kapasite (max_sessions)</strong> → ölçmeden <strong>küçük</strong> başlayın (örnek: 25). Ölçümden sonra panelden &quot;Kapasiteyi değiştir&quot; ile artırırsınız.</li>
                <li><strong>Uyarı Yüzdesi</strong> → 80 (sunucu %80 dolunca uyarı çıkar)</li>
              </ul>
              <p className="mt-2 italic">Bilgi notu: Formda anahtarın <strong>değeri</strong> istenmez; yalnız adı yazılır.</p>
            </div>

            <div>
              <h3 className="font-semibold text-text mb-1">Adım 6 — &quot;Bağlantıyı Test Et&quot;, sonra &quot;Kaydet&quot;</h3>
              <ul className="list-disc pl-5 space-y-1 mb-2">
                <li>Önce <strong>Bağlantıyı Test Et</strong>&apos;e basın. Yeşil &quot;Bağlandı&quot; görmelisiniz. Hata olursa anlamları:
                  <ul className="list-circle pl-5 mt-1 space-y-1 text-text-muted">
                    <li>&quot;Adres https:// olmalı&quot; → adresi <code className="bg-surface-hover px-1 py-0.5 rounded text-xs">https://</code> ile yazın.</li>
                    <li>&quot;Bu adrese bağlanılamaz (dahili adres)&quot; → internetten erişilebilir bir adres yazın.</li>
                    <li>&quot;Supabase&apos;de ... secret&apos;ı yok&quot; → 2. ve 3. adımdaki secret&apos;ları eklediğinizi ve adı doğru yazdığınızı kontrol edin.</li>
                    <li>&quot;WAHA anahtarı reddedildi&quot; → Supabase&apos;deki API anahtarı ile WAHA&apos;ya girdiğiniz anahtar farklı.</li>
                    <li>&quot;Zaman aşımı&quot; / &quot;Sunucuya ulaşılamadı&quot; → adres, DNS ve güvenlik duvarı ayarlarını kontrol edin.</li>
                  </ul>
                </li>
                <li>Test başarılıysa <strong>Kaydet</strong>. Yukarıdaki tabloda yeni sunucu satırı görünür.</li>
                <li>Test başarısız olsa da kaydedebilirsiniz ama bunun için kutuyu işaretlemeniz gerekir; yalnız ne yaptığınızı biliyorsanız yapın.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-text mb-1">Adım 7 — Doğrulayın ve (isteğe bağlı) ölçümü kurun</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Yeni sunucu tabloda &quot;Aktif&quot; görünmeli. Sunucu 1 dolana kadar yeni işletmeler yine Sunucu 1&apos;e gider; &quot;SIRADAKİ&quot; etiketi hangi sunucuya gidileceğini gösterir.</li>
                <li>Yeni işletmeleri hemen yeni sunucuya yönlendirmek isterseniz Sunucu 1&apos;de <strong>&quot;Yeni kayıt almayı durdur&quot;</strong> düğmesine basın.</li>
                <li>CPU/RAM ölçümü için: Supabase&apos;e <code className="bg-surface-hover px-1 py-0.5 rounded text-xs">WAHA_METRICS_SECRET_2</code> secret&apos;ı ekleyin ve yeni sunucuya ölçüm betiğini kurun (adımlar: <code className="bg-surface-hover px-1 py-0.5 rounded text-xs">docs/waha4/KURULUM.md</code>). Betikte <code className="bg-surface-hover px-1 py-0.5 rounded text-xs">SERVER_ID</code> olarak bu sunucunun kimliği kullanılır; kimliği Claude&apos;dan ya da yönetici veritabanı kaydından alın.</li>
                <li>Birkaç gün sonra ölçüme bakıp &quot;Kapasiteyi değiştir&quot; ile gerçekçi bir üst sınır girin.</li>
              </ul>
            </div>
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-warning mb-2">Sık yapılan hatalar</h4>
                <ul className="list-disc pl-4 space-y-1 text-warning/90">
                  <li>Anahtar değerlerini forma yazmak (yalnız secret <strong>adı</strong> yazılır).</li>
                  <li>Webhook anahtarını sonradan değiştirip &quot;Webhook ayarını yenile&quot;ye basmamak: bot, yenileme yapılana kadar mesajlara cevap vermez. Anahtarı değiştirirseniz hemen o sunucunun satırında <strong>&quot;Webhook ayarını yenile&quot;</strong>&apos;ye basın.</li>
                  <li>Aynı sıra numarasını iki sunucuda kullanmak (&quot;Bu sıra numarası başka bir sunucuda kullanılıyor&quot; hatası verir).</li>
                  <li>WAHA&apos;yı <code className="bg-warning/20 px-1 py-0.5 rounded text-xs">http://</code> ile açık bırakmak.</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
