export function YeniSunucuKilavuzu() {
  return (
    <details className="bg-card border border-border rounded-2xl mb-8 overflow-hidden group">
      <summary className="p-6 cursor-pointer list-none flex items-center justify-between outline-none">
        <span className="text-lg font-medium text-white">Yeni sunucu nasıl eklenir? (adım adım kılavuz)</span>
        <span className="text-text-muted transition-transform duration-200 group-open:rotate-180">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </summary>
      
      <div className="p-6 pt-0 border-t border-border mt-4 text-sm text-text-muted space-y-6">
        <p>
          Sunucular sırayla dolar: önce Sunucu 1, o dolunca (ya da &quot;yeni kayıt almayı durdur&quot; denince) yeni işletmeler Sunucu 2&apos;ye gider. Mevcut işletmeler <strong>taşınmaz</strong>, bağlantıları kopmaz. Yeni sunucu eklemek için aşağıdaki 7 adımı sırayla yapın. Önce 1–4. adımları bitirin, formu en son doldurun.
        </p>

        <ol className="list-decimal pl-5 space-y-6">
          <li>
            <strong className="text-white block mb-2">Adım 1 — Yeni bir sunucu (VPS) alın ve WAHA&apos;yı kurun</strong>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Ubuntu 24.04 yüklü yeni bir VPS alın. Boyut seçerken bilin: 1 çekirdek / 4 GB RAM&apos;li bir makine çok az oturum taşıyabilir; kapasiteyi 7. adımda ölçümle belirleyeceksiniz.</li>
              <li>WAHA&apos;yı Sunucu 1&apos;i kurduğunuz yöntemle (WAHA dokümantasyonu: <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">WAHA_DOKUMANTASYONU.md</code>) kurun. <strong>Motor NOWEB</strong> olmalı. WAHA&apos;nın kendi <strong>API anahtarını</strong> (<code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">WAHA_API_KEY</code> ortam değişkeni) bir sonraki adımda üreteceğiniz değerle başlatın.</li>
            </ul>
          </li>

          <li>
            <strong className="text-white block mb-2">Adım 2 — Sunucuya HTTPS ile erişilebilir bir adres verin</strong>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Bu sayfa yalnız <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">https://</code> ile başlayan adresleri kabul eder (şifresiz <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">http://</code> kabul edilmez).</li>
              <li>Bir alan adı seçin (örnek: <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">waha2.alanadiniz.com</code>) ve DNS&apos;te bu adın <strong>A kaydını</strong> yeni sunucunun IP adresine yönlendirin.</li>
              <li>Sunucuda Caddy kurup şu iki satırlık ayarı kullanırsanız sertifikayı otomatik alır:
                <pre className="bg-surface border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto mt-2 mb-2"><code>waha2.alanadiniz.com {'{'}
  reverse_proxy 127.0.0.1:3000
{'}'}</code></pre>
              </li>
              <li>Tarayıcıda <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">https://waha2.alanadiniz.com</code> adresini açıp WAHA&apos;nın yanıt verdiğini kontrol edin. <strong>WAHA&apos;nın 3000 numaralı portunu internete doğrudan açık bırakmayın</strong> (güvenlik duvarında yalnız 80 ve 443 açık olsun).</li>
            </ul>
          </li>

          <li>
            <strong className="text-white block mb-2">Adım 3 — İki gizli anahtar üretin (kendi bilgisayarınızda)</strong>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>İki ayrı rastgele değer üretin. Komut: <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">openssl rand -hex 32</code> (iki kez çalıştırın). Windows PowerShell kullanıyorsanız: <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono overflow-x-auto inline-block align-bottom max-w-full whitespace-nowrap">$b=New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b|%&#123;$_.ToString(&apos;x2&apos;)&#125;)</code></li>
              <li><strong>1. değer = API anahtarı</strong> (WAHA&apos;ya girilir). <strong>2. değer = Webhook anahtarı</strong> (imza doğrulama için).</li>
              <li>Bu değerleri bir parola yöneticisine kaydedin. <strong>Hiçbir sohbete, e-postaya ya da bu forma yapıştırmayın.</strong></li>
            </ul>
          </li>

          <li>
            <strong className="text-white block mb-2">Adım 4 — Anahtarları Supabase&apos;e &quot;secret&quot; olarak ekleyin</strong>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Supabase → Edge Functions → Secrets bölümünde iki secret ekleyin. Sunucu 2 için örnek adlar:
                <ul className="list-circle pl-5 mt-1 space-y-1">
                  <li><code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">WAHA_API_KEY_2</code> → 1. değer (API anahtarı)</li>
                  <li><code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">WAHA_WEBHOOK_SECRET_2</code> → 2. değer (webhook anahtarı)</li>
                </ul>
              </li>
              <li><strong>Ad kuralı:</strong> API anahtarının adı <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">WAHA_API_KEY</code> ile, webhook anahtarının adı <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">WAHA_WEBHOOK_SECRET</code> ile <strong>başlamalı</strong>; sonuna <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">_2</code>, <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">_3</code> gibi sıra eklenir. Başka bir ad bu sayfada kabul edilmez.</li>
            </ul>
            <div className="bg-surface border border-border rounded-lg p-3 text-sm mt-3">
              Bilgi notu: Secret&apos;ı <strong>önce</strong> ekleyin; &quot;Bağlantıyı test et&quot; düğmesi secret&apos;ı bulamazsa &quot;Supabase&apos;de ... secret&apos;ı yok&quot; der.
            </div>
          </li>

          <li>
            <strong className="text-white block mb-2">Adım 5 — Formu doldurun (aşağıdaki &quot;Yeni Sunucu Ekle&quot; kutusu)</strong>
            <table className="w-full text-left border-collapse mt-2 mb-2">
              <thead>
                <tr className="border-b border-border text-white">
                  <th className="py-2 pr-4 font-medium">Alan</th>
                  <th className="py-2 font-medium">Ne yazılır</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-4">Ad</td>
                  <td className="py-2"><code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">WAHA-2</code> gibi sizin göreceğiniz bir ad</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Adres (base_url)</td>
                  <td className="py-2"><code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">https://waha2.alanadiniz.com</code></td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">API Gizli Adı</td>
                  <td className="py-2"><code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">WAHA_API_KEY_2</code> (4. adımdaki ad)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Webhook Gizli Adı</td>
                  <td className="py-2"><code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">WAHA_WEBHOOK_SECRET_2</code> (4. adımdaki ad)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Sıra (fill_order)</td>
                  <td className="py-2">kendiliğinden gelen sayıyı bırakın (mevcut en büyük sıra + 1). Her sunucunun sırası farklı olmalı.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Kapasite (max_sessions)</td>
                  <td className="py-2">ölçmeden <strong>küçük</strong> başlayın (örnek: 25). Ölçümden sonra panelden &quot;Kapasiteyi değiştir&quot; ile artırırsınız.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Uyarı Yüzdesi</td>
                  <td className="py-2">80 (sunucu %80 dolunca uyarı çıkar)</td>
                </tr>
              </tbody>
            </table>
            <div className="bg-surface border border-border rounded-lg p-3 text-sm mt-3">
              Bilgi notu: Formda anahtarın <strong>değeri</strong> istenmez; yalnız adı yazılır.
            </div>
          </li>

          <li>
            <strong className="text-white block mb-2">Adım 6 — &quot;Bağlantıyı Test Et&quot;, sonra &quot;Kaydet&quot;</strong>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Önce <strong>Bağlantıyı Test Et</strong>&apos;e basın. Yeşil &quot;Bağlandı&quot; görmelisiniz. Hata olursa anlamları:
                <ul className="list-circle pl-5 mt-1 space-y-1">
                  <li>&quot;Adres https:// olmalı&quot; → adresi <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">https://</code> ile yazın.</li>
                  <li>&quot;Bu adrese bağlanılamaz (dahili adres)&quot; → internetten erişilebilir bir adres yazın.</li>
                  <li>&quot;Supabase&apos;de ... secret&apos;ı yok&quot; → 4. adımdaki secret&apos;ı ekleyin ve adı doğru yazdığınızı kontrol edin.</li>
                  <li>&quot;WAHA anahtarı reddedildi&quot; → Supabase&apos;deki API anahtarı ile WAHA&apos;ya girdiğiniz anahtar farklı.</li>
                  <li>&quot;Zaman aşımı&quot; / &quot;Sunucuya ulaşılamadı&quot; → adres, DNS ve güvenlik duvarı ayarlarını kontrol edin.</li>
                </ul>
              </li>
              <li>Test başarılıysa <strong>Kaydet</strong>. Yukarıdaki tabloda yeni sunucu satırı görünür.</li>
              <li>Test başarısız olsa da kaydedebilirsiniz ama bunun için kutuyu işaretlemeniz gerekir; yalnız ne yaptığınızı biliyorsanız yapın.</li>
            </ul>
          </li>

          <li>
            <strong className="text-white block mb-2">Adım 7 — Doğrulayın ve (isteğe bağlı) ölçümü kurun</strong>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Yeni sunucu tabloda &quot;Aktif&quot; görünmeli. Sunucu 1 dolana kadar yeni işletmeler yine Sunucu 1&apos;e gider; &quot;SIRADAKİ&quot; etiketi hangi sunucuya gidileceğini gösterir.</li>
              <li>Yeni işletmeleri hemen yeni sunucuya yönlendirmek isterseniz Sunucu 1&apos;de <strong>&quot;Yeni kayıt almayı durdur&quot;</strong> düğmesine basın.</li>
              <li>CPU/RAM ölçümü için: Supabase&apos;e <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">WAHA_METRICS_SECRET_2</code> secret&apos;ı ekleyin ve yeni sunucuya ölçüm betiğini kurun (adımlar: <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">docs/waha4/KURULUM.md</code>). Betikte <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">SERVER_ID</code> olarak bu sunucunun kimliği kullanılır; kimliği Claude&apos;dan ya da yönetici veritabanı kaydından alın.</li>
              <li>Birkaç gün sonra ölçüme bakıp &quot;Kapasiteyi değiştir&quot; ile gerçekçi bir üst sınır girin.</li>
            </ul>
          </li>
        </ol>

        <div className="bg-warning/10 border border-warning/20 text-warning rounded-lg p-3 text-sm mt-6">
          <strong className="block mb-2">Sık yapılan hatalar</strong>
          <ul className="list-disc pl-5 space-y-1">
            <li>Anahtar değerlerini forma yazmak (yalnız secret <strong>adı</strong> yazılır).</li>
            <li>Webhook anahtarını sonradan değiştirip &quot;Webhook ayarını yenile&quot;ye basmamak: bot, yenileme yapılana kadar mesajlara cevap vermez. Anahtarı değiştirirseniz hemen o sunucunun satırında <strong>&quot;Webhook ayarını yenile&quot;</strong>&apos;ye basın.</li>
            <li>Aynı sıra numarasını iki sunucuda kullanmak (&quot;Bu sıra numarası başka bir sunucuda kullanılıyor&quot; hatası verir).</li>
            <li>WAHA&apos;yı <code className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs font-mono">http://</code> ile açık bırakmak.</li>
          </ul>
        </div>
      </div>
    </details>
  );
}
