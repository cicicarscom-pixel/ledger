export class BotSettingsRepository {
  static async resolveBotSettingsForOrg(supabaseClient: any, merchantId: string) {
    const { data: ownerMember } = await supabaseClient.from('organization_members').select('user_id').eq('organization_id', merchantId).eq('role', 'owner').maybeSingle();
    if (!ownerMember) return { data: null, error: new Error('Owner not found') };
    return await supabaseClient.from('bot_settings').select('*').eq('merchant_id', ownerMember.user_id).maybeSingle();
  }
}
