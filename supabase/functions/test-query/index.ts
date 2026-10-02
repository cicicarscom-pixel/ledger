// DEVRE DIŞI (02.10.2026, güvenlik): önceki sürüm kimlik kontrolü olmadan organization_members tablosunun
// tamamını döndürüyordu. Hata ayıklama ucuydu; hiçbir uygulama kullanmıyor. Claude canlıda bu sürümü deploy etti.
Deno.serve(() => new Response(JSON.stringify({ error: 'disabled' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
