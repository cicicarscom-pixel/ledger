## 🚨 Kritik Kural: Deploy Süreci ve Yasaklı Fonksiyonlar
Deploy komutları ASLA toplu (supabase functions deploy argümansız) çalıştırılmaz, her zaman hedef fonksiyon adıyla tek tek çalıştırılır. Deploy sırasında yasaklı veya hedef dışı bir fonksiyonda hata çıkarsa, o dosyaya dokunulmaz — durum olduğu gibi raporlanır ve talimat beklenir.

| flow-reset-ai-data | Test/müşteri veri sıfırlama — sadece organization_id/profile_id/merchant_id filtresiyle çalışır, bağlantı verilerine (bot_settings, social_accounts) dokunmaz. |
