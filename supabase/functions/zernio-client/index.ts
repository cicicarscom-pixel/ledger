import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { ZernioClient } from "../shared/infrastructure/clients/ZernioClient.ts";
import { ZernioError } from "../shared/infrastructure/zernio/ZernioError.ts";

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
    const { action, payload = {} } = await req.json();

    // Initialize Clients
    const zernio = new ZernioClient();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // IMPORTANT: using SERVICE_ROLE key allows bypassing RLS so we can confidently write to cache table
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let result = null;

    /**
     * Helper Function: Analytics Caching Logic
     * 1. Checks `analytics_cache` for fresh data (< 1 hour).
     * 2. If valid, fast returns it.
     * 3. If stale or miss, calls the Zernio API, upserts the cache, and returns it.
     */
    async function fetchAnalyticsWithCache(accountId: string, platform: string, metricType: string, fetchFn: () => Promise<any>) {
      if (!accountId || !platform) {
         // Fallback if we don't have enough keys to cache properly
         return await fetchFn();
      }
      
      const { data: cacheData } = await supabase
        .from('analytics_cache')
        .select('data, updated_at')
        .eq('account_id', accountId)
        .eq('platform', platform)
        .eq('metric_type', metricType)
        .maybeSingle();

      if (cacheData) {
        const updatedAt = new Date(cacheData.updated_at).getTime();
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        if (now - updatedAt < oneHour) {
          console.log(`[Cache HIT] ${platform} - ${metricType}`);
          return cacheData.data;
        }
      }

      console.log(`[Cache MISS/STALE] Fetching from API: ${platform} - ${metricType}`);
      const freshDataRes = await fetchFn();
      
      // Extract data safely, sometimes sdk wraps it in { data: ... }
      const freshData = freshDataRes.data || freshDataRes;

      const { error: upsertErr } = await supabase.from('analytics_cache').upsert({
        account_id: accountId,
        platform,
        metric_type: metricType,
        data: freshData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'account_id,platform,metric_type' });
      
      if (upsertErr) {
        console.error(`[Cache Write Error] ${platform} - ${metricType}:`, upsertErr);
      }

      return freshData;
    }


    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new ZernioError("Missing Authorization header", 401);
    
    // Resolve user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new ZernioError("Unauthorized", 401);

    // Fetch user's active organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership?.organization_id) throw new ZernioError("Kullanıcı herhangi bir organizasyona bağlı değil.", 403);
    const callerOrgId = membership.organization_id;

    // --- GLOBAL OWNERSHIP VALIDATION ---
    // If action includes an accountId, verify it belongs to the callerOrgId
    const globalAccountId = payload.accountId || payload.query?.accountId;
    if (globalAccountId && action !== 'disconnect-account') {
       const { data: acc } = await supabase.schema('integration').from('social_accounts')
         .select('organization_id').eq('zernio_account_id', globalAccountId).maybeSingle();
       if (!acc || acc.organization_id !== callerOrgId) throw new ZernioError("Forbidden: Account not owned by this organization.", 403);
    } else if (globalAccountId && action === 'disconnect-account') {
       const { data: acc } = await supabase.schema('integration').from('social_accounts')
         .select('organization_id').eq('zernio_account_id', globalAccountId).maybeSingle();
       if (!acc || acc.organization_id !== callerOrgId) throw new ZernioError("Forbidden: Account not owned by this organization.", 403);
    }
    
    // If action is delete-post, verify post belongs to callerOrgId
    if (action === 'delete-post' && payload.postId) {
       const { data: post } = await supabase.from('posts')
         .select('profile_id').eq('zernio_post_id', payload.postId).maybeSingle();
       if (!post || post.profile_id !== callerOrgId) throw new ZernioError("Forbidden: Post not owned by this organization.", 403);
    }

    switch (action) {
      case 'get-connect-url': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new ZernioError("Missing Authorization header", 401);
        
        // Resolve user
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) throw new ZernioError("Unauthorized", 401);

        // Fetch user's active organization
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (!membership?.organization_id) throw new ZernioError("Kullanıcı herhangi bir organizasyona bağlı değil.", 403);
        const orgId = membership.organization_id;
        const platform = payload.platform;

        console.log(`Resolving Zernio Profile for Org: ${orgId}, Platform: ${platform}`);
        
        // 1. Lock & Resolve via RPC
        const { data: resolved, error: rpcError } = await supabase.rpc('resolve_zernio_profile_for_platform', {
          p_org_id: orgId,
          p_platform: platform
        });

        if (rpcError || !resolved) {
          console.error("RPC Error:", rpcError);
          throw new ZernioError("Zernio profil slotu ayarlanamadı.", 500);
        }

        let finalZernioProfileId = resolved.zernio_profile_id;

        // 2. If new slot, create deterministically in Zernio
        if (resolved.is_new) {
          const profileName = `wg_${orgId}_${resolved.profile_slot}`;
          const idempotencyKey = `zernio-profile:${orgId}:${resolved.profile_slot}`;
          
          console.log(`Creating NEW Zernio Profile: ${profileName} with Idempotency Key: ${idempotencyKey}`);
          
          // Use raw fetch to pass Idempotency-Key header, as SDK might not expose it
          const zernioRes = await fetch('https://zernio.com/api/v1/profiles', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('ZERNIO_API_KEY')}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify({ name: profileName })
          });

          if (!zernioRes.ok) {
            const errText = await zernioRes.text();
            throw new ZernioError(`Zernio API Error: ${errText}`, zernioRes.status);
          }

          const zernioData = await zernioRes.json();
          finalZernioProfileId = zernioData.profile?.id || zernioData.profile?._id || zernioData.id || zernioData._id;

          if (!finalZernioProfileId) throw new ZernioError("Created profile ID is missing", 500);

          // Update the reserved slot in DB
          const { error: profileUpdateErr } = await supabase.schema('integration').from('zernio_profiles').update({
            zernio_profile_id: finalZernioProfileId,
            status: 'active'
          }).eq('id', resolved.mapping_id);

          if (profileUpdateErr) {
            console.error(`Failed to persist Zernio profile id for mapping ${resolved.mapping_id}:`, profileUpdateErr);
          }
        }

        console.log(`Getting Connect URL for Zernio Profile: ${finalZernioProfileId}, platform: ${platform}`);
        const urlRes: any = await zernio.accounts.getConnectUrl({ 
           platform: platform, 
           profileId: finalZernioProfileId, 
           redirectUrl: payload.redirectUrl 
        });
        
        result = { 
          ...urlRes,
          ...(urlRes.data || {}),
          authUrl: urlRes.data?.authUrl || urlRes.data?.url || urlRes.authUrl || urlRes.url,
          profileId: finalZernioProfileId 
        };
        break;
      }

      case 'sync-accounts': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new ZernioError("Missing Authorization header", 401);
        
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) throw new ZernioError("Unauthorized", 401);

        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (!membership?.organization_id) {
          result = { accounts: [] };
          break;
        }

        const orgId = membership.organization_id;

        // Fetch ALL active Zernio Profiles for this organization
        const { data: activeProfiles } = await supabase
          .schema('integration')
          .from('zernio_profiles')
          .select('id, zernio_profile_id')
          .eq('organization_id', orgId)
          .eq('status', 'active');

        if (!activeProfiles || activeProfiles.length === 0) {
          result = { accounts: [] };
          break;
        }

        let allAccounts: any[] = [];
        const syncedAccountIds: string[] = [];

        // Sync from Zernio for each profile
        for (const profile of activeProfiles) {
          try {
            const accRes: any = await zernio.accounts.listAccounts(profile.zernio_profile_id);
            const accounts = accRes.data?.accounts || accRes.accounts || accRes.data || [];
            allAccounts = allAccounts.concat(accounts);

            if (accounts.length > 0) {
              const mappedAccounts = accounts.map((acc: any) => ({
                organization_id: orgId,
                zernio_profile_mapping_id: profile.id,
                zernio_profile_id: profile.zernio_profile_id,
                zernio_account_id: acc._id || acc.id || acc.accountId || acc.uuid,
                platform: acc.platform || 'unknown',
                username: acc.username || acc.displayName || acc.name || acc.platform,
                is_active: true,
                needs_reconnection: false,
                last_seen_at: new Date().toISOString()
              }));
              
              for (const acc of mappedAccounts) {
                syncedAccountIds.push(acc.zernio_account_id);
              }
              
              await supabase.schema('integration').from('social_accounts').upsert(
                mappedAccounts,
                { onConflict: 'zernio_account_id' }
              );
            }
          } catch (e) {
            console.error(`Failed to sync accounts for Zernio Profile: ${profile.zernio_profile_id}`, e);
          }
        }

        // Soft Reconciliation: Mark locally existing but currently missing accounts as suspect
        // rather than hard deleting them.
        if (syncedAccountIds.length > 0) {
          const { data: existingLocalAccounts } = await supabase
            .schema('integration')
            .from('social_accounts')
            .select('id, zernio_account_id')
            .eq('organization_id', orgId);

          if (existingLocalAccounts) {
            const missingIds = existingLocalAccounts
              .filter(a => !syncedAccountIds.includes(a.zernio_account_id))
              .map(a => a.id);

            if (missingIds.length > 0) {
              await supabase.schema('integration').from('social_accounts')
                .update({ sync_missing_since: new Date().toISOString() })
                .in('id', missingIds)
                .is('sync_missing_since', null); // only update if not already marked
            }
          }
        }
        
        result = { accounts: allAccounts };
        break;
      }

      case 'sync-posts': {
        const organizationId = callerOrgId;
        if (!organizationId) {
          result = { posts: [], error: 'organizationId is required' };
          break;
        }
        
        const { data: profileMapping } = await supabase
          .schema('integration')
          .from('zernio_profiles')
          .select('zernio_profile_id')
          .eq('organization_id', organizationId)
          .eq('is_primary', true)
          .maybeSingle();

        if (!profileMapping || !profileMapping.zernio_profile_id) {
          result = { posts: [] };
          break;
        }
        
        const profileId = profileMapping.zernio_profile_id;
        
        const postsRes: any = await zernio.posts.listPosts(profileId);
        const postsList = postsRes.data?.posts || postsRes.posts || postsRes.data || [];
        
        const userId = callerOrgId;
        if (userId) {
           const mappedPosts = postsList.map((p: any) => {
               let mediaList = p.mediaItems?.map((m: any) => m.url) || [];
               if (mediaList.length === 0 && p.picture) mediaList = [p.picture];
               if (mediaList.length === 0 && p.image) mediaList = [p.image];
               if (mediaList.length === 0 && p.thumbnail) mediaList = [p.thumbnail];
               const platformList = p.platforms?.map((pl: any) => typeof pl === 'string' ? pl : pl.platform) || [];
               return {
                  profile_id: userId,
                  zernio_post_id: p._id || p.id,
                  content: p.content || '',
                  media_urls: mediaList,
                  status: p.status || 'published',
                  platforms: platformList,
                  scheduled_for: p.scheduledFor || p.createdAt || new Date().toISOString()
               };
            });
           
           const { data: existingPosts } = await supabase.from('posts').select('id, zernio_post_id').eq('profile_id', userId);
           const existingIds = existingPosts?.map((p: any) => p.zernio_post_id) || [];
           
           if (mappedPosts.length > 0) {
               const newPosts = mappedPosts.filter((p: any) => !existingIds.includes(p.zernio_post_id));
               if (newPosts.length > 0) {
                  const { error } = await supabase.from('posts').insert(newPosts);
                  if (error) console.error("Supabase insert error (posts):", error);
               }
           }

           // DELETE posts that no longer exist in Zernio
           const currentPostIds = mappedPosts.map((p: any) => p.zernio_post_id).filter(Boolean);
           if (existingPosts && existingPosts.length > 0) {
               const postsToDelete = existingPosts
                  .filter((p: any) => p.zernio_post_id && !currentPostIds.includes(p.zernio_post_id))
                  .map((p: any) => p.id);
               
               if (postsToDelete.length > 0) {
                  const { error } = await supabase.from('posts').delete().in('id', postsToDelete);
                  if (error) console.error("Supabase delete error (posts):", error);
               }
           }
        }
        
        result = { posts: postsList, profileId };
        break;
      }
      
      case 'get-inbox-pictures': {
        const organizationId = callerOrgId;
        if (!organizationId) {
          result = { pictures: {}, error: 'organizationId is required' };
          break;
        }
        
        const { data: profileMapping } = await supabase
          .schema('integration')
          .from('zernio_profiles')
          .select('zernio_profile_id')
          .eq('organization_id', organizationId)
          .eq('is_primary', true)
          .maybeSingle();

        if (!profileMapping || !profileMapping.zernio_profile_id) {
          result = { pictures: {} };
          break;
        }
        const profileId = profileMapping.zernio_profile_id;
        
        const pictures: Record<string, string> = {};
        
        try {
          const inboxRes: any = await zernio.comments.listInboxComments(profileId);
          const posts = inboxRes.data?.data || [];
          
          await Promise.all(posts.map(async (p: any) => {
            if (p.id && p.picture) pictures['post_' + p.id] = p.picture;
            
            if (p.id && p.accountId) {
              try {
                const commentsRes: any = await zernio.comments.getInboxPostComments(p.id, p.accountId);
                const commentsList = commentsRes.data?.comments || commentsRes.comments || [];
                commentsList.forEach((c: any) => {
                  const cId = c.id || c._id;
                  const cPic = c.author?.picture || c.author?.profile_picture || c.author?.avatar_url || c.from?.picture || c.from?.profile_picture;
                  if (cId && cPic) pictures[cId] = cPic;
                });
              } catch (e) {
                console.error("Error fetching comments pictures for post", p.id);
              }
            }
          }));
          
          const convRes: any = await zernio.inbox.listInboxConversations(profileId);
          const convList = convRes.data?.data || convRes.data?.conversations || [];
          convList.forEach((conv: any) => {
            const convId = conv.id || conv._id;
            const cPic = conv.participantPicture || conv.participant?.picture || conv.participants?.[0]?.picture || conv.participants?.[0]?.avatarUrl || conv.from?.picture || conv.author?.picture;
            if (convId && cPic) pictures[convId] = cPic;
          });
        } catch(e) {
          console.error("Error in get-inbox-pictures", e);
        }

        result = { pictures, profileId };
        break;
      }

      case 'sync-comments': {
        const organizationId = callerOrgId;
        if (!organizationId) {
          result = { comments: [], error: 'organizationId is required' };
          break;
        }
        
        const { data: profileMapping } = await supabase
          .schema('integration')
          .from('zernio_profiles')
          .select('zernio_profile_id')
          .eq('organization_id', organizationId)
          .eq('is_primary', true)
          .maybeSingle();

        if (!profileMapping || !profileMapping.zernio_profile_id) {
          result = { comments: [] };
          break;
        }
        
        const profileId = profileMapping.zernio_profile_id;
        
        const inboxRes: any = await zernio.comments.listInboxComments(profileId);
        const commentedPosts = inboxRes.data?.data || [];
        
        let allComments: any[] = [];
        
        await Promise.all(commentedPosts.map(async (post: any) => {
           if (!post.id || !post.accountId) return;
           try {
               const commentsRes: any = await zernio.comments.getInboxPostComments(post.id, post.accountId);
               const commentsList = commentsRes.data?.comments || commentsRes.comments || [];
               
               let pictureUrl = post.picture || post.image || post.thumbnail || post.mediaUrl || post.media?.[0]?.url || post.media?.[0] || post.mediaItems?.[0]?.url || null;
               
               const localMap = new Map();
               commentsList.forEach((c: any) => localMap.set(c.id || c._id, c));
               
               const enrichedComments = commentsList.map((c: any) => {
                  let content = c.message || c.content || c.text || '';
                  if (c.parentCommentId || c.isReply) {
                     const parentId = c.parentCommentId || c.parentId;
                     const parent = localMap.get(parentId);
                     if (parent && !content.startsWith('↳ @')) {
                        const pName = parent.from?.name || parent.from?.username || parent.username || parent.author?.name || 'Yorum';
                        content = `↳ @${pName}:\n${content}`;
                     } else if (!content.startsWith('↳ @')) {
                        content = `↳ @Yorum:\n${content}`;
                     }
                  }
                  return {
                     ...c,
                     message: content,
                     post: {
                        id: post.id,
                        content: post.content,
                        picture: pictureUrl,
                        accountId: post.accountId,
                        platform: post.platform || 'unknown'
                     }
                  };
               });
              allComments = [...allComments, ...enrichedComments];
           } catch (err) {
              console.error("Error fetching comments for post", post.id, err);
           }
        }));
        
        const postPictures: Record<string, string> = {};
        commentedPosts.forEach((post: any) => {
           if (post.id && post.picture) postPictures[post.id] = post.picture;
        });
        
        if (Object.keys(postPictures).length > 0) {
           const { data: emptyPosts } = await supabase.from('posts').select('id, zernio_post_id, media_urls').in('zernio_post_id', Object.keys(postPictures));
           
           if (emptyPosts) {
              await Promise.all(emptyPosts.map(async (ep) => {
                 if (!ep.media_urls || ep.media_urls.length === 0) {
                    const pic = postPictures[ep.zernio_post_id];
                    if (pic) {
                       await supabase.from('posts').update({ media_urls: [pic] }).eq('id', ep.id);
                    }
                 }
              }));
           }
        }
        
        const { data: orphanedComments } = await supabase.from('comments').select('id, zernio_post_id').is('post_id', null).not('zernio_post_id', 'is', null);
        
        if (orphanedComments && orphanedComments.length > 0) {
           const zPostIds = [...new Set(orphanedComments.map((c: any) => c.zernio_post_id))];
           const { data: matchingPosts } = await supabase.from('posts').select('id, zernio_post_id').in('zernio_post_id', zPostIds);
           
           if (matchingPosts) {
              const postMap: Record<string, string> = {};
              matchingPosts.forEach((p: any) => { postMap[p.zernio_post_id] = p.id; });
              
              await Promise.all(orphanedComments.map(async (oc) => {
                 const postId = postMap[oc.zernio_post_id];
                 if (postId) {
                    await supabase.from('comments').update({ post_id: postId }).eq('id', oc.id);
                 }
              }));
           }
        }
        
        allComments.sort((a, b) => new Date(b.createdTime || b.createdAt).getTime() - new Date(a.createdTime || a.createdAt).getTime());
        result = { comments: allComments, profileId };
        break;
      }
      
      case 'sync-messages': {
        const organizationId = callerOrgId;
        if (!organizationId) {
          result = { conversations: [], error: 'organizationId is required' };
          break;
        }
        
        const { data: profileMapping } = await supabase
          .schema('integration')
          .from('zernio_profiles')
          .select('zernio_profile_id')
          .eq('organization_id', organizationId)
          .eq('is_primary', true)
          .maybeSingle();

        if (!profileMapping || !profileMapping.zernio_profile_id) {
          result = { conversations: [] };
          break;
        }
        
        const profileId = profileMapping.zernio_profile_id;
        
        const inboxRes: any = await zernio.inbox.listInboxConversations(profileId);
        const convList = inboxRes.data?.data || [];
        
        const userId = callerOrgId;
        if (userId && convList.length > 0) {
           const mappedMessages = convList.map((m: any) => {
              return {
                 conversation_id: m.id || m._id,
                 zernio_message_id: m.id || m._id,
                 direction: 'incoming',
                 content: m.snippet || m.text || ''
              };
           });
           
           const { data: existingMsgs } = await supabase.from('messages').select('zernio_message_id');
           const existingIds = existingMsgs?.map((m: any) => m.zernio_message_id) || [];
           
           const newMessages = mappedMessages.filter((m: any) => !existingIds.includes(m.zernio_message_id));
           if (newMessages.length > 0) {
              const { error } = await supabase.from('messages').insert(newMessages);
              if (error) console.error("Supabase insert error (messages):", error);
           }
        }
        
        result = { conversations: convList, profileId };
        break;
      }
      
      case 'sync-chat': {
        const { conversationId, accountId } = payload;
        if (!conversationId || !accountId) {
            throw new Error("conversationId and accountId are required for sync-chat");
        }
        const inboxRes: any = await zernio.inbox.getInboxConversationMessages(conversationId, accountId);
        result = { messages: inboxRes.data?.messages || inboxRes.messages || [] };
        break;
      }
      case 'sync-post-comments': {
        const { postId, accountId } = payload;
        if (!postId || !accountId) {
            throw new Error("postId and accountId are required for sync-post-comments");
        }
        const commentsRes: any = await zernio.comments.getInboxPostComments(postId, accountId);
        result = { comments: commentsRes.data?.comments || commentsRes.comments || [] };
        break;
      }

      case 'create-post': {
        const finalMediaItems: any[] = [];
        if (payload.mediaItems && payload.mediaItems.length > 0) {
          for (const item of payload.mediaItems) {
            if (item.url && item.url.startsWith('data:')) {
               const matches = item.url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
               if (matches && matches.length === 3) {
                 const mimeType = matches[1];
                 const base64Data = matches[2];
                 
                 const binaryStr = atob(base64Data);
                 const bytes = new Uint8Array(binaryStr.length);
                 for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                 }
                 
                 let uploadRes: any;
                 try {
                   uploadRes = await zernio.media.uploadMediaDirect(mimeType, bytes);
                 } catch (uploadError: any) {
                   throw new Error("Zernio uploadMediaDirect Hatası: " + (uploadError.message || JSON.stringify(uploadError)));
                 }
                 
                 // Zernio'nun uploadMediaDirect metodu bir URL döndürür
                 const mediaUrl = uploadRes?.data?.url || uploadRes?.url;
                 if (mediaUrl) {
                    finalMediaItems.push({ url: mediaUrl });
                 } else {
                    throw new Error("Resim yüklenemedi, Zernio'dan URL dönmedi: " + JSON.stringify(uploadRes));
                 }
               }
            } else if (item.url) {
               // Normal URL ise direkt ekle
               finalMediaItems.push({ url: item.url });
            }
          }
        }

        // --- SECURE PLATFORM TARGETING ---
        const { data: connectedAccounts } = await supabase
           .schema('integration')
           .from('social_accounts')
           .select('platform, zernio_account_id')
           .eq('organization_id', callerOrgId);
        
        const accountsMap = new Map();
        if (connectedAccounts) {
           connectedAccounts.forEach((acc) => {
              accountsMap.set(acc.platform.toLowerCase(), acc.zernio_account_id);
           });
        }

        let securePlatforms: any[] = [];
        if (Array.isArray(payload.platforms)) {
           for (const requestedPlatform of payload.platforms) {
              const pName = typeof requestedPlatform === 'string' ? requestedPlatform.toLowerCase() : requestedPlatform.platform.toLowerCase();
              const accId = accountsMap.get(pName);
              if (!accId) {
                 throw new ZernioError(`Forbidden: Organizasyonun bağlı bir '${pName}' hesabı bulunamadı. Lütfen hesap bağlantısını kontrol edin.`, 403);
              }
              securePlatforms.push({ platform: pName, accountId: accId });
           }
        } else {
           throw new ZernioError("Bad Request: platforms dizisi eksik veya hatalı", 400);
        }

        const createPostPayload = {
          title: payload.title,
          content: payload.content,
          platforms: securePlatforms,
          scheduledFor: payload.scheduledFor,
          timezone: payload.timezone,
          publishNow: payload.publishNow,
          mediaItems: finalMediaItems.length > 0 ? finalMediaItems : undefined,
          tags: payload.tags
        };

        try {
          result = await zernio.posts.createPost(createPostPayload);
        } catch (postError: any) {
          throw new ZernioError("Zernio createPost Hatası: " + postError.message, postError.status, 'CREATE_POST_FAILED');
        }
        break;
      }

      case 'delete-post': {
        const { postId, deleteFromPlatforms } = payload;
        if (!postId) {
          throw new Error("postId is required for delete-post action");
        }
        try {
          result = await zernio.posts.deletePost(postId, deleteFromPlatforms);
        } catch (postError: any) {
          throw new ZernioError("Zernio deletePost Hatası: " + postError.message, postError.status, 'DELETE_POST_FAILED');
        }
        break;
      }

      case 'send-message': {
        let accountId = payload.accountId;
        if (!accountId && callerOrgId && payload.platform) {
           const { data: socialAcc } = await supabase
              .schema('integration')
              .from('social_accounts')
              .select('zernio_account_id')
              .eq('organization_id', callerOrgId)
              .ilike('platform', payload.platform)
              .limit(1);
           if (socialAcc && socialAcc.length > 0) {
               accountId = socialAcc[0].zernio_account_id;
           }
        }
        if (!accountId) throw new Error("Missing accountId for send-message");
        result = await zernio.inbox.sendMessage(accountId, payload.conversationId, payload.message);
        break;
      }

      case 'reply-comment': {
        let accountId = payload.accountId;
        if (!accountId && callerOrgId && payload.platform) {
           const { data: socialAcc } = await supabase
              .schema('integration')
              .from('social_accounts')
              .select('zernio_account_id')
              .eq('organization_id', callerOrgId)
              .ilike('platform', payload.platform)
              .limit(1);
           if (socialAcc && socialAcc.length > 0) {
               accountId = socialAcc[0].zernio_account_id;
           }
        }
        if (!accountId) throw new Error("Missing accountId for reply-comment");
        result = await zernio.comments.replyToComment(accountId, payload.postId, payload.commentId, payload.message);
        break;
      }
        case 'send-private-reply': {
          let accountId = payload.accountId;
          if (!accountId && callerOrgId && payload.platform) {
             const { data: socialAcc } = await supabase
                .schema('integration')
                .from('social_accounts')
                .select('zernio_account_id')
                .eq('organization_id', callerOrgId)
                .ilike('platform', payload.platform)
                .limit(1);
             if (socialAcc && socialAcc.length > 0) {
                 accountId = socialAcc[0].zernio_account_id;
             }
          }
          if (!accountId) throw new Error("Missing accountId for send-private-reply");
          result = await zernio.comments.sendPrivateReply(accountId, payload.postId, payload.commentId, payload.message);
          break;
        }


      // ==========================================
      // CACHED ANALYTICS ENDPOINTS
      // ==========================================
      case 'get-youtube-insights': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'youtube', 'channel_insights', () => zernio.analytics.getYouTubeChannelInsights(payload)); 
        break; 
      }
      case 'get-youtube-demographics': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'youtube', 'demographics', () => zernio.analytics.getYouTubeDemographics(payload)); 
        break; 
      }
      case 'get-tiktok-insights': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'tiktok', 'account_insights', () => zernio.analytics.getTikTokAccountInsights(payload)); 
        break; 
      }
      case 'get-youtube-daily-views': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'youtube', 'daily_views', () => zernio.analytics.getYouTubeDailyViews(payload)); 
        break; 
      }
      case 'get-linkedin-page-analytics': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'linkedin', 'org_aggregate', () => zernio.analytics.getLinkedInOrgAggregateAnalytics(payload)); 
        break; 
      }
      case 'get-linkedin-post-stats': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'linkedin', 'post_stats', () => zernio.analytics.getLinkedInPostAnalytics(payload)); 
        break; 
      }
      case 'get-linkedin-aggregate-stats': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'linkedin', 'aggregate', () => zernio.analytics.getLinkedInAggregateAnalytics(payload)); 
        break; 
      }
      case 'get-instagram-insights': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'instagram', 'account_insights', () => zernio.analytics.getInstagramAccountInsights(payload)); 
        break; 
      }
      case 'get-instagram-demographics': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'instagram', 'demographics', () => zernio.analytics.getInstagramDemographics(payload)); 
        break; 
      }
      case 'get-instagram-follower-history': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'instagram', 'follower_history', () => zernio.analytics.getInstagramFollowerHistory(payload)); 
        break; 
      }
      case 'get-gbp-search-keywords': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'googlebusiness', 'search_keywords', () => zernio.analytics.getGoogleBusinessSearchKeywords(payload)); 
        break; 
      }
      case 'get-gbp-performance': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'googlebusiness', 'performance', () => zernio.analytics.getGoogleBusinessPerformance(payload)); 
        break; 
      }
      case 'get-facebook-insights': { 
        const accId = payload.accountId || payload.query?.accountId;
        result = await fetchAnalyticsWithCache(accId, 'facebook', 'page_insights', () => zernio.analytics.getFacebookPageInsights(payload)); 
        break; 
      }
      case 'get-follower-stats': { 
        const accId = payload.accountId || payload.query?.accountId || 'global';
        result = await fetchAnalyticsWithCache(accId, 'all', 'follower_stats', () => zernio.accounts.getFollowerStats(payload)); 
        break; 
      }
      case 'get-daily-metrics': { 
        const accId = payload.accountId || payload.query?.accountId || 'global';
        result = await fetchAnalyticsWithCache(accId, 'all', 'daily_metrics', () => zernio.analytics.getDailyMetrics(payload)); 
        break; 
      }
      case 'get-content-decay': { 
        const accId = payload.accountId || payload.query?.accountId || 'global';
        result = await fetchAnalyticsWithCache(accId, 'all', 'content_decay', () => zernio.analytics.getContentDecay(payload)); 
        break; 
      }
      case 'get-post-timeline': { 
        const accId = payload.accountId || payload.query?.accountId || 'global';
        result = await fetchAnalyticsWithCache(accId, 'all', 'post_timeline', () => zernio.analytics.getPostTimeline(payload)); 
        break; 
      }
      case 'get-posting-frequency': { 
        const accId = payload.accountId || payload.query?.accountId || 'global';
        result = await fetchAnalyticsWithCache(accId, 'all', 'posting_frequency', () => zernio.analytics.getPostingFrequency(payload)); 
        break; 
      }
      case 'get-best-times': { 
        const accId = payload.accountId || payload.query?.accountId || 'global';
        result = await fetchAnalyticsWithCache(accId, 'all', 'best_times', () => zernio.analytics.getBestTimeToPost(payload)); 
        break; 
      }
      case 'get-post-analytics': { 
        const accId = payload.accountId || payload.query?.accountId || 'global';
        result = await fetchAnalyticsWithCache(accId, 'all', 'post_analytics', () => zernio.analytics.getPostTimeline(payload)); 
        break; 
      }

      case 'create-profile': {
        const userId = callerOrgId;
        if (!userId) throw new ZernioError("Missing userId", 400);
        
        const { error } = await supabase.from('profiles').upsert({ 
          id: userId, 
          business_name: 'AI Esnaf Profil',
          created_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'disconnect-account': {
        const { accountId } = payload;
        if (!accountId) throw new ZernioError("Missing accountId", 400);
        
        await zernio.accounts.disconnectAccount(accountId);
        await supabase.schema('integration').from('social_accounts').delete().eq('zernio_account_id', accountId);

        result = { success: true };
        break;
      }

      default:
        throw new ZernioError(`Bilinmeyen action: ${action}`, 400, 'UNKNOWN_ACTION');
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error("Zernio Edge Function Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message, 
        code: error.code || 'UNKNOWN_ERROR', 
        details: error.details 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 } // Often 200 with success: false in GraphQL/RPC style
    );
  }
});
