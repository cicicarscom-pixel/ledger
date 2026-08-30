import { WahaClient } from '../../infrastructure/clients/WahaClient.ts';
import { ZernioClient } from '../../infrastructure/clients/ZernioClient.ts';
import { CommunicationLoggerRepository } from '../../infrastructure/repositories/CommunicationLoggerRepository.ts';
import { AIOrchestrator } from '../../ai/AIOrchestrator.ts';
import { AIContext } from '../../ai/types.ts';
import { PersonaService } from '../../ai/persona/PersonaService.ts';

interface Dependencies {
  aiOrchestrator: AIOrchestrator;
  wahaClient: WahaClient;
  zernioClient: ZernioClient;
  logger: CommunicationLoggerRepository;
  personaService: PersonaService;
}

export class HandleIncomingMessageUseCase {
  constructor(private readonly deps: Dependencies) {}

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
      .select('*')
      .eq('merchant_id', merchantId)
      .single();
      
    // Fetch organization AI settings for timezone
    const { data: orgAiSettings } = await supabaseClient
      .from('organization_ai_settings')
      .select('timezone')
      .eq('merchant_id', merchantId)
      .maybeSingle();
      
    const resolvedTimezone = orgAiSettings?.timezone || 'Europe/Istanbul';

    if (botError) {
      console.warn("[HandleIncomingMessageUseCase] Bot settings fetch error or not found.");
      return; // Can't proceed without settings
    }

    // 2. Check Toggles
    if (source === 'whatsapp' && botSettings.whatsapp_bot_active === false) {
      return;
    }
    if (source === 'social' && botSettings.social_bot_active === false) {
      return;
    }

    // 2b. Persona Engine (Phase 3): resolve a persona config for this
    // merchant, if any. This is always "production" mode here — this is the
    // real customer-message path (Phase 4's Live Test uses its own
    // persona-test function with executionMode "simulation", not this use
    // case). A null result just means "no usable persona right now" for any
    // reason (none configured, table not migrated yet, transient DB error);
    // PromptBuilder's own fallback chain (guardrail #6) decides what to do
    // with that — this use case never needs to know the details.
    let personaConfig = null;
    try {
      personaConfig = await this.deps.personaService.resolveForMerchant(merchantId, 'production');
    } catch (error) {
      console.error('[HandleIncomingMessageUseCase] PersonaService resolution failed, falling back to legacy prompt:', error);
    }

    // 3. Build AI Context
    const aiContext: AIContext = {
      organizationId: merchantId,
      customerId: senderId, // For Waha, this is phone number. For Zernio, conversation/user ID.
      merchantId: merchantId,
      now: new Date(),
      timezone: resolvedTimezone,
      botSettings: botSettings,
      personaConfig,
      executionMode: 'production', // real customer message — never simulation
      channel: {
        source: source,
        platform: platform || (source === 'whatsapp' ? 'whatsapp' : 'unknown'),
        supportsInteractiveButtons: source === 'whatsapp', // Only WAHA supports interactive easily
        maxSuggestedResponseLength: source === 'social' ? 'short' : undefined
      }
    };

    // 4. Delegate to AIOrchestrator
    let aiResponse = "";
    try {
      aiResponse = await this.deps.aiOrchestrator.handleMessage(aiContext, userMessage);
    } catch (error) {
      console.error("[HandleIncomingMessageUseCase] AI Orchestrator failed:", error);
      return;
    }

    // 5. Send Response via Appropriate Channel
    try {
      if (source === 'whatsapp') {
        await this.deps.wahaClient.sendWhatsAppMessage(merchantId, senderId, aiResponse);
      } else if (source === 'social') {
        if (isComment && postId && zernioAccountId) {
          // Like and reply to comment
          await this.deps.zernioClient.comments.likeComment(zernioAccountId, postId, senderId);
          const replyRes = await this.deps.zernioClient.comments.replyToComment(zernioAccountId, postId, senderId, aiResponse);
          
          // Save AI comment locally
          const { data: localPost } = await supabaseClient.from('posts').select('id').eq('zernio_post_id', postId).single();
          if (localPost) {
            await supabaseClient.from('comments').insert({
              post_id: localPost.id,
              profile_id: merchantId,
              zernio_comment_id: replyRes?.data?.id || `ai_mock_${Date.now()}`,
              zernio_post_id: postId,
              content: aiResponse,
              author_name: 'Workigom Flow Profil',
            });
          }
        } else {
          // Direct Message
          if (!zernioAccountId) {
            const { data: accounts } = await supabaseClient.from('social_accounts').select('zernio_account_id').eq('profile_id', merchantId).limit(1);
            if (accounts && accounts.length > 0) zernioAccountId = accounts[0].zernio_account_id;
          }
          if (zernioAccountId) {
            const msgRes = await this.deps.zernioClient.inbox.sendMessage(zernioAccountId, senderId, aiResponse);
            
            // Save AI message locally
            const { data: localConv } = await supabaseClient.from('conversations').select('id').eq('zernio_conversation_id', senderId).single();
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
      }
    } catch (error) {
      console.error(`[HandleIncomingMessageUseCase] Error sending message via ${source}:`, error);
    }

    // 6. Log the Interaction
    await this.deps.logger.logInteraction(
      supabaseClient,
      merchantId,
      source,
      senderId,
      userMessage,
      aiResponse
    );
  }
}
