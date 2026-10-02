import { AccountantScope, getAdminClient, normalizeName } from "./scope.ts"

// Bildirim araçları — YALNIZ müşavirin aktif mükelleflerine (02.10.2026).
// Önceden: alıcı bütün platformda aranıyordu ve "herkese" aracı platformdaki TÜM kullanıcılara yazıyordu.
// Ayrıca bildirim kullanıcı kimliğiyle yazılıyordu; notifications.profile_id = organizations.id olduğu için
// kayıt hiç oluşmuyordu (yabancı anahtar hatası). Artık profile_id = mükellef işletmesinin kimliği.

async function insertNotifications(scope: AccountantScope, orgIds: string[], title: string, message: string): Promise<string | null> {
  const rows = orgIds.map((id) => ({
    profile_id: id,
    sender_id: scope.userId,
    title,
    message,
    type: 'ai_alert',
    is_read: false,
    metadata: { kind: 'accountant_message', accounting_firm_id: scope.firmId, firm_name: scope.firmName },
  }));
  const { error } = await getAdminClient().from('notifications').insert(rows);
  return error ? error.message : null;
}

export async function sendNotificationToTaxpayer(scope: AccountantScope, nameOrId: string, title: string, message: string): Promise<string> {
  if (scope.taxpayers.length === 0) return "Aktif bağlantılı mükellefiniz olmadığı için mesaj gönderilemedi.";
  const query = normalizeName(nameOrId);
  const exact = scope.taxpayers.filter((t) => t.id === nameOrId || normalizeName(t.name) === query);
  const words = query.split(' ').filter((w) => w.length > 2);
  const matches = exact.length > 0 ? exact
    : scope.taxpayers.filter((t) => { const n = normalizeName(t.name); return words.length > 0 && words.every((w) => n.includes(w)); });

  if (matches.length === 0) {
    return `"${nameOrId}" adında aktif bir mükellefiniz bulunamadı. Mükellefleriniz: ${scope.taxpayers.map((t) => t.name).join(', ')}.`;
  }
  if (matches.length > 1) {
    return `"${nameOrId}" birden fazla mükellefle eşleşti: ${matches.map((t) => t.name).join(', ')}. Hangisi olduğunu netleştirin.`;
  }
  const err = await insertNotifications(scope, [matches[0].id], title, message);
  return err ? `Mesaj gönderilemedi: ${err}` : `Mesaj "${matches[0].name}" mükellefine iletildi.`;
}

export async function sendNotificationToAllTaxpayers(scope: AccountantScope, title: string, message: string): Promise<string> {
  if (scope.taxpayers.length === 0) return "Aktif bağlantılı mükellefiniz olmadığı için duyuru gönderilemedi.";
  const err = await insertNotifications(scope, scope.taxpayers.map((t) => t.id), title, message);
  return err ? `Duyuru gönderilemedi: ${err}` : `Duyuru ${scope.taxpayers.length} aktif mükellefinize iletildi.`;
}
