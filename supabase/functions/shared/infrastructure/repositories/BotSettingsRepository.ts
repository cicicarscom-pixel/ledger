export class BotSettingsRepository {
  static async resolveBotSettingsForOrg(supabaseClient: any, merchantId: string) {
    // merchantId is actually the user_id (owner_id) because Waha session is named after user.id
    return await supabaseClient.from('bot_settings').select('*').eq('merchant_id', merchantId).maybeSingle();
  }
}
