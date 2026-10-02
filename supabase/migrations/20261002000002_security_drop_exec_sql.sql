-- GÜVENLİK (02.10.2026; Claude canlıya uyguladı, dosya kayıt amaçlı).
-- exec_sql(q text) SECURITY DEFINER idi ve anon + authenticated çalıştırabiliyordu: herkese açık anon anahtarıyla
-- rastgele SQL (tüm veriyi okuma/değiştirme/silme). 20260924000002_add_exec_sql.sql ile eklenmişti; hiçbir kod kullanmıyor.
revoke all on function public.exec_sql(text) from public, anon, authenticated;
drop function if exists public.exec_sql(text);
