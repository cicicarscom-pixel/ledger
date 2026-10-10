# TALİMAT 67 — Analiz: platform filtresi 400 hatası (flowweb, hazır yama)

**Bulgu (kullanıcı konsolu, 10.10.2026):** Analiz sayfasında platform seçilince `posts?...platform=eq.instagram|facebook|youtube` istekleri **400** dönüyor. Neden: `posts` tablosunda `platform` sütunu yok, `platforms` (dizi) var. Sonuç: platform seçilince "Toplam Gönderi" ve biçim dağılımı 0 kalıyordu. **Faz 9A'dan önce de vardı** (taşıma birebirdi); düzeltme tek satır: `.contains('platforms', [selectedPlatform.id])`.

**Depo:** flowweb. **Başlangıç:** `origin/main` = `6cb93b7` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/68-flowweb-analiz-platform-filtre.patch`.

## Yapılacaklar
1. K1.  2. `git am --3way docs/patches/68-flowweb-analiz-platform-filtre.patch` (içerik değiştirilmez).
3. `npm ci --ignore-scripts --no-audit --no-fund` + yedi kontrol AYNEN.  4. K4 push, GitHub Actions yeşil, Vercel Ready.  5. Derleme/EAS yapma.

## Kullanıcı testi
Analiz → platform: YouTube/Facebook/Instagram seç → konsolda 400 hatası kalmamalı, "Toplam Gönderi" DB'deki sayıyı göstermeli (YouTube 9, Facebook 9, Instagram 2 gönderi kaydı var).
