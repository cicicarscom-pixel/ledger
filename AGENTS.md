## 🚨 Kritik Kural: Deploy Süreci ve Yasaklı Fonksiyonlar
Deploy komutları ASLA toplu (supabase functions deploy argümansız) çalıştırılmaz, her zaman hedef fonksiyon adıyla tek tek çalıştırılır. Deploy sırasında yasaklı veya hedef dışı bir fonksiyonda hata çıkarsa, o dosyaya dokunulmaz — durum olduğu gibi raporlanır ve talimat beklenir.
