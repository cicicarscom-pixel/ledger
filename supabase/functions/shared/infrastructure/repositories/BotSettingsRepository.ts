export class BotSettingsRepository {
  static async resolveBotSettingsForOrg(supabaseClient: any, orgId: string) {
    // orgId = organizations.id (WAHA oturum adındaki sahip kimliği kullanım yerinde orgId'ye çözülür)
    return await supabaseClient.from('bot_settings').select('*').eq('org_id', orgId).maybeSingle();
  }
}
