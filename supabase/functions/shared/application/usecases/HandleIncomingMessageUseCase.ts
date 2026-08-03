import { GeminiClient } from '../../infrastructure/clients/GeminiClient.ts';
import { WahaClient } from '../../infrastructure/clients/WahaClient.ts';
import { ZernioClient } from '../../infrastructure/clients/ZernioClient.ts';
import { CommunicationLoggerRepository } from '../../infrastructure/repositories/CommunicationLoggerRepository.ts';

export class HandleIncomingMessageUseCase {
  private geminiClient = new GeminiClient();
  private wahaClient = new WahaClient();
  private zernioClient = new ZernioClient();
  private logger = new CommunicationLoggerRepository();

  async execute(
    supabaseClient: any,
    payload: {
      merchantId: string;
      source: 'whatsapp' | 'social';
      senderId: string;
      userMessage: string;
      platform?: string; // e.g. 'instagram' for social
      isComment?: boolean;
      postId?: string;
      zernioAccountId?: string;
    }
  ): Promise<void> {
    const { merchantId, source, senderId, userMessage, platform, isComment, postId, zernioAccountId: initialZernioAccountId } = payload;
    let zernioAccountId = initialZernioAccountId;

    // 1. Fetch Bot Settings
    const { data: botSettings, error: botError } = await supabaseClient
      .from('bot_settings')
      .select('whatsapp_bot_active, social_bot_active, system_prompt')
      .eq('merchant_id', merchantId)
      .single();

    if (botError) {
      return;
    }

    // 2. Check Toggles (Manuel Şalter Kontrolü)
    if (source === 'whatsapp' && botSettings?.whatsapp_bot_active === false) {
      return;
    }

    if (source === 'social' && botSettings?.social_bot_active === false) {
      return;
    }

    // 3. Determine System Prompt
    let systemPrompt = "";
    if (source === 'whatsapp') {
      systemPrompt = botSettings?.system_prompt || "Sen profesyonel bir asistansın. Kısa ve net yanıt ver.";
    } else {
      systemPrompt = "Sen markanın sosyal medya uzmanısın. Samimi ol, sadece RAG (veritabanı) verilerine dayan, asla kurgu yapma. Kısa ve emojili yanıtlar ver.";
    }

    // 4. Get Response from Gemini
    let aiResponse = "";
    try {
      aiResponse = await this.geminiClient.generateResponse(systemPrompt, userMessage);
    } catch (error) {
      return;
    }

    // 5. Send Response via Appropriate Client
    try {
      if (source === 'whatsapp') {
        await this.wahaClient.sendWhatsAppMessage(merchantId, senderId, aiResponse);
        // Also save to local messages if applicable
      } else if (source === 'social') {
        if (isComment && postId && zernioAccountId) {
          // Like the comment first
          await this.zernioClient.likeComment(zernioAccountId, postId, senderId);
          // senderId here is the commentId
          const replyRes = await this.zernioClient.replyToComment(zernioAccountId, postId, senderId, aiResponse);
          
          // Save AI comment to local Supabase DB
          // First, find the internal post_id
          const { data: localPost } = await supabaseClient
            .from('posts')
            .select('id')
            .eq('zernio_post_id', postId)
            .single();

          if (localPost) {
            await supabaseClient.from('comments').insert({
              post_id: localPost.id,
              profile_id: merchantId,
              zernio_comment_id: replyRes?.data?.id || `ai_mock_${Date.now()}`,
              zernio_post_id: postId,
              content: aiResponse,
              author_name: 'AI Esnaf Profil',
              // If we have parent_id or something similar, map it
            });
          }
        } else {
          if (!zernioAccountId) {
            console.log("Missing zernioAccountId, attempting to fetch from social_accounts...");
            const { data: accounts } = await supabaseClient
              .from('social_accounts')
              .select('zernio_account_id')
              .eq('profile_id', merchantId)
              .limit(1);
            if (accounts && accounts.length > 0) {
              zernioAccountId = accounts[0].zernio_account_id;
            } else {
              zernioAccountId = "";
            }
          }
          const msgRes = await this.zernioClient.sendMessage(zernioAccountId!, senderId, aiResponse);
          
          // Save AI message to local Supabase DB
          // find conversation
          const { data: localConv } = await supabaseClient
            .from('conversations')
            .select('id')
            .eq('zernio_conversation_id', senderId) // assuming senderId is conversationId here
            .single();

          if (localConv) {
            await supabaseClient.from('messages').insert({
              conversation_id: localConv.id,
              profile_id: merchantId,
              zernio_message_id: msgRes?.data?.id || `ai_mock_${Date.now()}`,
              direction: 'outgoing',
              content: aiResponse,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error sending message via ${source}:`, error);
      // We might still want to log that we attempted and failed, but for now we throw/log
    }

    // 6. Log the Interaction
    await this.logger.logInteraction(
      supabaseClient,
      merchantId,
      source,
      senderId,
      userMessage,
      aiResponse
    );
  }
}
