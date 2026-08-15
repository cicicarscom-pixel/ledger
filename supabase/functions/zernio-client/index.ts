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

    switch (action) {
      case 'get-connect-url': {
        let profileId = payload.profileId;
        if (!profileId) {
          console.log("No profileId provided. Listing profiles to find or create 'AI Esnaf Profil'...");
          let profiles: any[] = [];
          try {
            const listRes: any = await zernio.profiles.listProfiles();
            profiles = listRes.data?.profiles || listRes.profiles || listRes.data || [];
          } catch(e: any) {
            console.log("listProfiles error", e.message);
          }
          
          const existing = profiles.find((p: any) => p.name === 'AI Esnaf Profil');
          
          if (existing) {
             profileId = existing.id || existing.profileId || existing._id || existing.uuid;
          } else {
             const profileRes: any = await zernio.profiles.createProfile('AI Esnaf Profil');
             profileId = profileRes.data?.profile?.id || profileRes.data?.id || profileRes.id;
          }
        }
        
        console.log("Getting connect URL for profileId:", profileId, "platform:", payload.platform);
        const urlRes: any = await zernio.accounts.getConnectUrl({ 
           platform: payload.platform, 
           profileId, 
           redirectUrl: payload.redirectUrl 
        });
        
        result = { 
          ...urlRes,
          ...(urlRes.data || {}),
          authUrl: urlRes.data?.authUrl || urlRes.data?.url || urlRes.authUrl || urlRes.url,
          profileId 
        };
        break;
      }

      case 'sync-accounts': {
        const listRes: any = await zernio.profiles.listProfiles();
        const profiles = listRes.data?.profiles || listRes.profiles || listRes.data || [];
        const existing = profiles.find((p: any) => p.name === 'AI Esnaf Profil');
        
        if (!existing) {
          result = { accounts: [] };
          break;
        }
        
        const profileId = existing.id || existing.profileId || existing._id || existing.uuid;
        
        const accRes: any = await zernio.accounts.listAccounts(profileId);
        const accounts = accRes.data?.accounts || accRes.accounts || accRes.data || [];
        
        const { userId } = payload;
        if (userId) {
          if (accounts.length > 0) {
            const mappedAccounts = accounts.map((acc: any) => ({
              profile_id: userId,
              zernio_account_id: acc._id || acc.id || acc.accountId || acc.uuid,
              platform: acc.platform || 'unknown',
              account_name: acc.username || acc.displayName || acc.name || acc.platform,
              status: 'active'
            }));
            
            const { error } = await supabase.from('social_accounts').upsert(
              mappedAccounts,
              { onConflict: 'zernio_account_id' }
            );
            
            if (error && error.code === '42P10') {
                console.warn('[sync-accounts] UNIQUE constraint eksik. Geçici fallback aktif.');
                for (const acc of mappedAccounts) {
                  const { data: ex } = await supabase.from('social_accounts')
                    .select('id').eq('zernio_account_id', acc.zernio_account_id).maybeSingle();
                  if (!ex) {
                    await supabase.from('social_accounts').insert(acc);
                  }
                }
            } else if (error) {
                console.error('[sync-accounts] Upsert error:', error);
            }

            // DELETE accounts that no longer exist in Zernio
            const currentAccountIds = mappedAccounts.map((a: any) => a.zernio_account_id);
            if (currentAccountIds.length > 0) {
              const { data: userAccounts } = await supabase.from('social_accounts').select('id, zernio_account_id').eq('profile_id', userId);
              if (userAccounts) {
                const accountsToDelete = userAccounts.filter((a: any) => !currentAccountIds.includes(a.zernio_account_id)).map((a: any) => a.id);
                if (accountsToDelete.length > 0) {
                  await supabase.from('social_accounts').delete().in('id', accountsToDelete);
                }
              }
            }
          } else {
             await supabase.from('social_accounts').delete().eq('profile_id', userId);
          }
        }
        
        result = { accounts, profileId };
        break;
      }

      case 'sync-posts': {
        const listRes: any = await zernio.profiles.listProfiles();
        const profiles = listRes.data?.profiles || listRes.profiles || listRes.data || [];
        const existing = profiles.find((p: any) => p.name === 'AI Esnaf Profil');
        
        if (!existing) {
          result = { posts: [] };
          break;
        }
        
        const profileId = existing.id || existing.profileId || existing._id || existing.uuid;
        
        const postsRes: any = await zernio.posts.listPosts(profileId);
        const postsList = postsRes.data?.posts || postsRes.posts || postsRes.data || [];
        
        const { userId } = payload;
        if (userId && postsList.length > 0) {
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
           
           const { data: existingPosts } = await supabase.from('posts').select('zernio_post_id').eq('profile_id', userId);
           const existingIds = existingPosts?.map((p: any) => p.zernio_post_id) || [];
           
           const newPosts = mappedPosts.filter((p: any) => !existingIds.includes(p.zernio_post_id));
           if (newPosts.length > 0) {
              const { error } = await supabase.from('posts').insert(newPosts);
              if (error) console.error("Supabase insert error (posts):", error);
           }
        }
        
        result = { posts: postsList, profileId };
        break;
      }
      
      case 'get-inbox-pictures': {
        const listRes: any = await zernio.profiles.listProfiles();
        const profiles = listRes.data?.profiles || listRes.profiles || listRes.data || [];
        const existing = profiles.find((p: any) => p.name === 'AI Esnaf Profil');
        if (!existing) { result = { pictures: {} }; break; }
        const profileId = existing.id || existing.profileId || existing._id || existing.uuid;
        const inboxRes: any = await zernio.comments.listInboxComments(profileId);
        const posts = inboxRes.data?.data || [];
        const pictures: Record<string, string> = {};
        posts.forEach((p: any) => {
          if (p.id && p.picture) pictures[p.id] = p.picture;
        });
        result = { pictures, profileId };
        break;
      }

      case 'sync-comments': {
        const listRes: any = await zernio.profiles.listProfiles();
        const profiles = listRes.data?.profiles || listRes.profiles || listRes.data || [];
        const existing = profiles.find((p: any) => p.name === 'AI Esnaf Profil');
        
        if (!existing) {
          result = { comments: [] };
          break;
        }
        
        const profileId = existing.id || existing.profileId || existing._id || existing.uuid;
        
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
        const listRes: any = await zernio.profiles.listProfiles();
        const profiles = listRes.data?.profiles || listRes.profiles || listRes.data || [];
        const existing = profiles.find((p: any) => p.name === 'AI Esnaf Profil');
        
        if (!existing) {
          result = { conversations: [] };
          break;
        }
        
        const profileId = existing.id || existing.profileId || existing._id || existing.uuid;
        
        const inboxRes: any = await zernio.inbox.listInboxConversations(profileId);
        const convList = inboxRes.data?.data || [];
        
        const { userId } = payload;
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
        const finalMediaIds = [];
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
                 
                 // Zernio'nun dondurdugu benzersiz mediaId'yi al (Upload Once, Reference Everywhere optimization)
                 const mediaId = uploadRes?.data?.id || uploadRes?.id;
                 if (mediaId) {
                    finalMediaIds.push(mediaId);
                 } else {
                    throw new Error("Resim yüklenemedi, Zernio'dan mediaId dönmedi: " + JSON.stringify(uploadRes));
                 }
               }
            } else if (item.url) {
               // Eger base64 degil de normal bir http url geldiyse Zernio Media API'ye external URL upload istegi atiyoruz
               let uploadRes: any;
               try {
                 // Guncel Zernio API ile URL tabanli upload (varsayimsal veya sdk destegi)
                 const formData = new FormData();
                 formData.append('url', item.url);
                 
                 // Zernio backend'ine istek
                 const zernioReq = await fetch('https://api.zernio.com/v1/media/upload', {
                   method: 'POST',
                   headers: { 'Authorization': `Bearer ${Deno.env.get("ZERNIO_API_KEY")}` },
                   body: formData
                 });
                 uploadRes = await zernioReq.json();
               } catch (uploadError: any) {
                 console.error("URL upload error:", uploadError);
               }
               
               const mediaId = uploadRes?.data?.id || uploadRes?.id;
               if (mediaId) {
                 finalMediaIds.push(mediaId);
               }
            }
          }
        }

        const createPostPayload = {
          title: payload.title,
          content: payload.content,
          platforms: payload.platforms,
          scheduledFor: payload.scheduledFor,
          publishNow: payload.publishNow,
          // Artik URL listesi degil, dogrudan ID listesi gonderiyoruz
          mediaIds: finalMediaIds.length > 0 ? finalMediaIds : undefined,
          tags: payload.tags
        };

        try {
          result = await zernio.posts.createPost(createPostPayload);
        } catch (postError: any) {
          throw new ZernioError("Zernio createPost Hatası: " + postError.message, postError.status, 'CREATE_POST_FAILED');
        }
        break;
      }

      case 'send-message': {
        result = await zernio.inbox.sendMessage(payload.accountId, payload.conversationId, payload.message);
        break;
      }

      case 'reply-comment': {
        result = await zernio.comments.replyToComment(payload.accountId, payload.postId, payload.commentId, payload.message);
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

      case 'get-zernio-profiles': {
        const listRes: any = await zernio.profiles.listProfiles();
        const profiles = listRes.data?.profiles || listRes.profiles || listRes.data || [];
        result = { profiles };
        break;
      }
      
      case 'add-zernio-profile': {
        const { name } = payload;
        if (!name) throw new ZernioError("Missing profile name", 400);
        const profileRes: any = await zernio.profiles.createProfile(name);
        const newProfile = profileRes.data?.profile || profileRes.data || profileRes;
        result = { profile: newProfile };
        break;
      }

      case 'create-profile': {
        const { userId } = payload;
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
        await supabase.from('social_accounts').delete().eq('zernio_account_id', accountId);

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
