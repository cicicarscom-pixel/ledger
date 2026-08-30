export class CommunicationLoggerRepository {
  async logInteraction(
    supabaseClient: any,
    merchantId: string,
    platform: string,
    senderId: string,
    userMessage: string,
    aiResponse: string
  ): Promise<void> {
    const { error } = await supabaseClient
      .from('ai_communication_logs')
      .insert({
        merchant_id: merchantId,
        platform,
        sender_id: senderId,
        user_message: userMessage,
        ai_response: aiResponse
      });

    if (error) {
      console.error("CommunicationLoggerRepository Error:", error);
    }
  }

  async getRecentHistory(
    supabaseClient: any,
    merchantId: string,
    platform: string,
    senderId: string,
    limit: number = 5
  ): Promise<{ role: string, parts: { text: string }[] }[]> {
    const { data, error } = await supabaseClient
      .from('ai_communication_logs')
      .select('user_message, ai_response')
      .eq('merchant_id', merchantId)
      .eq('platform', platform)
      .eq('sender_id', senderId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error("[CommunicationLoggerRepository] getRecentHistory Error:", error);
      return [];
    }

    // Data is from newest to oldest, reverse it to chronological order
    const history: { role: string, parts: { text: string }[] }[] = [];
    data.reverse().forEach((row: any) => {
      if (row.user_message) {
        history.push({ role: 'user', parts: [{ text: row.user_message }] });
      }
      if (row.ai_response) {
        history.push({ role: 'model', parts: [{ text: row.ai_response }] });
      }
    });

    return history;
  }
}
