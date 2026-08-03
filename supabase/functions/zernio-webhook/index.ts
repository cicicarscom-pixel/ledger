import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { HandleIncomingMessageUseCase } from "../shared/application/usecases/HandleIncomingMessageUseCase.ts";

// Zernio webhook events typically have this structure (generalized)
interface ZernioWebhookEvent {
  event: string; // e.g. 'message.received', 'comment.created', 'review.created'
  timestamp: string;
  data: any;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Zernio Webhook Signature Verification (Security)
    // const signature = req.headers.get('x-zernio-signature');
    // const secret = Deno.env.get("ZERNIO_WEBHOOK_SECRET");
    // TODO: Implement HMAC SHA256 verification of the payload using the secret

    const payload: ZernioWebhookEvent = await req.json();

    // Initialize Supabase Client with SERVICE_ROLE to bypass RLS for background ingestion
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Resolve Profile ID from Zernio Account ID
    // Most events contain an accountId or profileId indicating which business received the interaction.
    const zernioAccountId = payload.account?.id || payload.accountId || payload.data?.accountId || payload.data?.account?.id;
    console.log(`[webhook] Received event=${payload.event} account=${zernioAccountId || 'unknown'} ts=${payload.timestamp || new Date().toISOString()}`);
    let profileId = null;

    if (zernioAccountId) {
      const { data: accountData, error: accountError } = await supabase
        .from('social_accounts')
        .select('profile_id')
        .eq('zernio_account_id', zernioAccountId)
        .single();

      if (!accountError && accountData) {
        profileId = accountData.profile_id;
      } else {
        console.warn(`Zernio Account ID ${zernioAccountId} not mapped to any profile.`);
      }
    }

    if (!profileId) {
      // Profil eşleşmesi yok — event'i atla (200 dön ki Zernio retry etmesin)
      console.warn(`[webhook] profileId bulunamadı, event atlandı. event=${payload.event} zernioAccountId=${zernioAccountId}`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'profile_not_mapped' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
    }

    // 3. Handle specific Zernio Events
    switch (payload.event) {
      
      case 'message.received':
      case 'message.sent': {
        const messageData = payload.message || payload.data || {};
        const { conversationId, id: messageId, direction, platform } = messageData;
        const textContent = messageData.text || messageData.message || '';
        const senderName = messageData.sender?.name || messageData.sender?.username || messageData.senderName || 'Bilinmeyen Kullanıcı';
        if (!profileId) throw new Error("Cannot process message without mapped profileId");

        // A. Upsert Conversation (manual to avoid missing unique constraint errors)
        let internalConvId = null;
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('zernio_conversation_id', conversationId)
          .single();

        if (existingConv) {
          internalConvId = existingConv.id;
        } else {
          const { data: newConv, error: newConvError } = await supabase
            .from('conversations')
            .insert({
              profile_id: profileId,
              zernio_conversation_id: conversationId,
              platform: platform || 'unknown',
              participant_name: senderName,
              status: 'active'
            })
            .select('id')
            .single();
          if (newConvError && newConvError.code !== '23505') throw newConvError;
          if (newConv) internalConvId = newConv.id;
        }

        // B. Insert Message
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            profile_id: profileId,
            conversation_id: internalConvId,
            zernio_message_id: messageId,
            direction: direction, // 'incoming' or 'outgoing'
            content: textContent
          });

        if (msgError && msgError.code !== '23505') { // Ignore unique constraint violations (duplicates)
          throw msgError;
        }

        if (direction === 'incoming' || direction === 'inbound') {
          const useCase = new HandleIncomingMessageUseCase();
          
          await useCase.execute(supabase, {
            merchantId: profileId,
            source: 'social',
            senderId: conversationId,
            userMessage: textContent,
            platform: platform || 'unknown',
            zernioAccountId: zernioAccountId
          });
        }
        
        break;
      }

      case 'post.published':
      case 'post.created': {
        const postData = payload.post || payload.data || {};
        const { id: postId, message, text, mediaItems, platforms, createdAt, status } = postData;
        const contentText = text || message || '';
        if (!profileId) throw new Error("Cannot process post without mapped profileId");

        const mediaList = mediaItems?.map((m: any) => m.url) || [];
        const platformList = platforms?.map((pl: any) => typeof pl === 'string' ? pl : pl.platform) || [];

        const { error: postError } = await supabase
          .from('posts')
          .insert({
            profile_id: profileId,
            zernio_post_id: postId,
            content: contentText,
            media_urls: mediaList,
            status: status || 'published',
            platforms: platformList,
            scheduled_for: createdAt || new Date().toISOString()
          });

        if (postError && postError.code !== '23505') throw postError;
        break;
      }

      case 'comment.created':
      case 'comment.received': {
        const commentData = payload.comment || payload.data || {};
        const { id: commentId, postId, platformPostId, message, text, fromName, author, platform } = commentData;
        const actualPostId = postId || platformPostId;
        const commentText = text || message || '';
        const authorName = author?.name || author?.username || fromName || 'Bilinmeyen';
        
        if (!profileId) throw new Error("Cannot process comment without mapped profileId");

        // Try to link to a known post, if available. If not found, create a stub.
        let internalPostId = null;
        if (actualPostId) {
          const { data: postData } = await supabase
            .from('posts')
            .select('id')
            .eq('zernio_post_id', actualPostId)
            .single();
          
          if (postData) {
            internalPostId = postData.id;
          } else {
            // Post doesn't exist yet — create a stub so the join works (using upsert to avoid race conditions)
            const { data: newPost, error: stubError } = await supabase
              .from('posts')
              .upsert({
                profile_id: profileId,
                zernio_post_id: actualPostId,
                content: '',
                media_urls: [],
                status: 'published',
                platforms: [platform || 'unknown'],
                scheduled_for: new Date().toISOString()
              }, { onConflict: 'zernio_post_id' })
              .select('id')
              .single();
            if (newPost) internalPostId = newPost.id;
          }
        }

        let finalCommentText = commentText;
        if (commentData.parentCommentId || commentData.isReply) {
          const parentId = commentData.parentCommentId || commentData.parentId;
          if (parentId) {
            const { data: parentComment } = await supabase
              .from('comments')
              .select('author_name, username')
              .eq('zernio_comment_id', parentId)
              .single();
            const pUser = parentComment?.author_name || parentComment?.username || 'Yorum';
            finalCommentText = `↳ @${pUser}:\n${commentText}`;
          } else {
            finalCommentText = `↳ @Yorum:\n${commentText}`;
          }
        }

        const { error: commentError } = await supabase
          .from('comments')
          .insert({
            profile_id: profileId,
            post_id: internalPostId,
            zernio_post_id: actualPostId,
            zernio_comment_id: commentId,
            username: authorName,
            content: finalCommentText,
            platform: platform || 'unknown'
          });

        if (commentError && commentError.code !== '23505') {
          // Log error to ai_jobs for debugging
          await supabase.from('ai_jobs').insert({
            task_type: 'debug_webhook_error',
            payload: { error: commentError, payload: payload },
            status: 'failed',
            priority: 1
          });
          throw commentError;
        }

        // C. AI Task Queue (Kuyruk) Sistemine Gönder
        // Önce botun aktif olup olmadığını kontrol et
        const { data: botSettings } = await supabase
          .from('bot_settings')
          .select('social_bot_active')
          .eq('merchant_id', profileId)
          .single();

        if (botSettings?.social_bot_active !== false) {
          // İnsan davranışı simülasyonu için 8 ile 13 dakika arası rastgele bir gecikme ekliyoruz.
          const randomMinutes = Math.floor(Math.random() * (13 - 8 + 1)) + 8;
          const scheduledAt = new Date(Date.now() + randomMinutes * 60000).toISOString();
          
          const aiJobPayload = {
            merchantId: profileId,
            source: 'social',
            senderId: commentId,
            userMessage: commentText,
            platform: platform || 'unknown',
            isComment: true,
            postId: actualPostId,
            zernioAccountId: zernioAccountId
          };

          await supabase.from('ai_jobs').insert({
            task_type: 'instagram_comment',
            payload: aiJobPayload,
            status: 'pending',
            priority: 3,
            scheduled_at: scheduledAt
          });
        }
        
        break;
      }

      case 'review.created': {
        const { id: reviewId, reviewerName, rating, text, platform } = payload.data;
        
        if (!profileId) throw new Error("Cannot process review without mapped profileId");

        const { error: reviewError } = await supabase
          .from('reviews')
          .insert({
            profile_id: profileId,
            zernio_review_id: reviewId,
            reviewer_name: reviewerName || 'Anonim',
            rating: rating || 5,
            content: text,
            platform: platform || 'google'
          });

        if (reviewError && reviewError.code !== '23505') throw reviewError;
        break;
      }

      default:
        console.log(`Unhandled Zernio Event: ${payload.event}`);
    }

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });

  } catch (error) {
    console.error("Zernio Webhook Error:", error.message);
    // Important: Webhooks should usually return 200 to acknowledge receipt even if processing fails,
    // otherwise Zernio will keep retrying and might disable the webhook. 
    // Return 200 but log the error.
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });
  }
});
