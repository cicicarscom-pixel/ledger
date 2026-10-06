# WAHA-4 Sunucu Metrikleri Kurulum Rehberi

Bu belge WAHA sunucusunda CPU ve RAM kullanımını Supabase paneline aktaran cron betiğinin kurulumunu anlatır.

## Adımlar

1. **Secret Ekleyin**
   Supabase Dashboard üzerinden `Edge Functions > Secrets` bölümüne gidin.
   Aşağıdaki komutla 32 baytlık rastgele bir değer üretin ve bunu Supabase'e ekleyin:
   ```bash
   openssl rand -hex 32
   ```
   **Secret Adı:** `WAHA_METRICS_SECRET_<sunucu_sırası>` (Örneğin ilk sunucu için `WAHA_METRICS_SECRET_1`)

2. **Betiği Sunucuya Kopyalayın**
   `waha-metrics-cron.sh` dosyasını WAHA'nın çalıştığı sunucuya (örneğin `/opt/waha-metrics-cron.sh` yoluna) kopyalayın ve çalıştırılabilir yapın:
   ```bash
   chmod +x /opt/waha-metrics-cron.sh
   ```

3. **Ortam Değişkenlerini Ayarlayın ve Test Edin**
   Dosyayı elle çalıştırarak test edin. Değerleri kendi sunucu kimliğiniz ve ürettiğiniz secret ile değiştirin:
   ```bash
   SERVER_ID="<sunucu_uuid>" METRICS_SECRET="<ürettiğiniz_secret>" /opt/waha-metrics-cron.sh
   ```
   Eğer başarılıysa loglarda (syslog veya journalctl) `Basarili: Metrikler gonderildi.` yazısını görmelisiniz.

4. **Cron'a Ekleyin**
   Kök (root) kullanıcısının crontab'ına ekleyin (`crontab -e`):
   ```cron
   */5 * * * * SERVER_ID="<sunucu_uuid>" METRICS_SECRET="<ürettiğiniz_secret>" /opt/waha-metrics-cron.sh
   ```

5. **Doğrulayın**
   Admin panelindeki "WhatsApp Sunucuları" sayfasına gidin. Birkaç dakika sonra ilgili sunucunun "CPU / RAM" sütunu ve ölçüm grafiği dolmaya başlayacaktır.
