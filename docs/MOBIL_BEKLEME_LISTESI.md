# Mobil bekleme listesi (kullanıcı kararı, 10.10.2026)

Mobilde derleme sayısı az olsun diye aşağıdaki işler **birikir**; kullanıcı "paketi hazırla" deyince tek talimat + tek derleme olarak verilir. Yeni bir madde bulunca buraya eklenir. Son derleme: `b5ea2a89` (Faz 9B+9C, `5e9f9af`).

| # | İş | Kaynak | Hazır yama | Derleme gerekir mi |
|---|---|---|---|---|
| 1 | `AnalyticsScreen` hesap sorgusuna `is_active=true` ve `needs_reconnection=false` süzgeci (web'deki Talimat 72 ile aynı hata) | konsol uyarısı | yok (üretilecek) | evet |
| 2 | `AGENTS.md` §3/§6 gerçek duruma getirme + README satırı (yalnız belge) | Faz D/F kapanışı | `75-flow-agents-tenant.patch` | hayır (kod yok; pakete eşlik eder) |
| 3 | Katman ihlalleri: `no-restricted-imports` 9 hata (relative `../../domain` vb. → takma ad) | Faz 9 kalanı | yok | evet |
| 4 | React Compiler `react-hooks/refs` (34) ve `set-state-in-effect` (18) | Faz 9 kalanı | yok | evet |
| 5 | Sabit Türkçe metinlerin i18n'i: `BotYonetimi`, `Randevu`, `Analytics`, `Inbox`, `AiMuhasebe` (dosya başı `eslint-disable i18next/no-literal-string` borcu; ~140 metin) | Faz 6 kalanı | yok | evet |
| 6 | `FlowAiHost` sesli sohbet durum makinesi ayrı kancaya; `YorumlarTab` (679 satır) mantık/görünüm ayrımı | Faz 9 kalanı | yok | evet (cihaz testi şart) |
| 7 | `AiUretimScreen.CaptionSection` (modül düzeyinde `persisted*` değişkenlerine yazıyor) taşınamadı: durum yönetimi yeniden tasarlanmalı | Faz 9C | yok | evet |

Kural: bu paket tek `git am` ile giren commit dizisi olarak, `expo export` doğrulamasıyla hazırlanır (Talimat 70 yöntemi).
