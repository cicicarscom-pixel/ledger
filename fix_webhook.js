const fs = require('fs');
const file = 'supabase/functions/zernio-webhook/index.ts';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const idx = 254;
const endIdx = 311;

const newBlock = `      case 'comment.created':
      case 'comment.received': {
        const commentData = payload.comment || payload.data || {};
        const { id: commentId, postId, platformPostId, message, text, fromName, author, platform } = commentData;
        const actualPostId = postId || platformPostId;
        const commentText = text || message || '';
        const authorName = author?.name || author?.username || fromName || 'Bilinmeyen';
        // ZERNIO_COMMENT_POST_RAW logu ile doğrulandı: webhook'un payload.post objesi
        // {id, platformPostId, content, imageUrl, permalink} şeklinde temiz alan isimleri
        // kullanıyor (tahmin ettiğimiz text/caption/description/title değil).
        let postImageUrl = payload.post?.imageUrl || null;
        let postContent = payload.post?.content || '';

        if (!profileId) throw new Error("Cannot process comment without mapped profileId");

        // Try to link to a known post, if available. If not found, create a stub.
        let internalPostId = null;
        if (actualPostId) {
          const { data: postData } = await supabase
            .from('posts')
            .select('id, media_urls, content')
            .eq('zernio_post_id', actualPostId)
            .single();

          // Webhook payload'ında caption/görsel gelmediyse (TikTok'ta doğrudan paylaşılmış,
          // Zernio üzerinden oluşturulmamış "native" gönderilerde webhook bunu hiç göndermiyor —
          // ZERNIO_COMMENT_POST_RAW ile doğrulandı), Zernio'nun REST API'sinden canlı olarak
          // çekmeyi dene. Bu, zernio-client'taki sync-posts action'ının yaptığı ile aynı çağrı.
          // Sadece gerçekten eksikse çalışır — normal (webhook'ta zaten dolu gelen) durumlarda
          // fazladan bir istek atılmaz.
          const needsRestFallback = !postContent && (!postData || !postData.content);
          if (needsRestFallback) {
            try {
              const { data: zernioProfile } = await supabase
                .schema('integration')
                .from('zernio_profiles')
                .select('zernio_profile_id')
                .eq('organization_id', profileId)
                .eq('is_primary', true)
                .maybeSingle();

              if (zernioProfile?.zernio_profile_id) {
                const zernio = new ZernioClient();
                const postsRes = await zernio.posts.listPosts(zernioProfile.zernio_profile_id);
                const postsList = postsRes.data?.posts || postsRes.posts || postsRes.data || [];
                const matchedPost = postsList.find((p) => (p._id || p.id) === actualPostId);
                if (matchedPost) {
                  if (!postContent && matchedPost.content) postContent = matchedPost.content;
                  if (!postImageUrl) {
                    postImageUrl = matchedPost.picture || matchedPost.image || matchedPost.thumbnail || null;
                  }
                }
              }
            } catch (restFallbackErr) {
              console.warn('[webhook] REST post-content fallback failed:', restFallbackErr);
            }
          }

          if (postData) {
            internalPostId = postData.id;
            // Update media_urls and/or content if newly available and not already present
            const postUpdates = {};
            if (postImageUrl && (!postData.media_urls || postData.media_urls.length === 0 || postData.media_urls[0] !== postImageUrl)) {
              postUpdates.media_urls = [postImageUrl];
            }
            if (postContent && !postData.content) {
              postUpdates.content = postContent;
            }
            if (Object.keys(postUpdates).length > 0) {
              await supabase.from('posts').update(postUpdates).eq('id', internalPostId);
            }
          } else {
            // Post doesn't exist yet - create a stub so the join works (using upsert to avoid race conditions)
            const { data: newPost, error: stubError } = await supabase
              .from('posts')
              .upsert({
                profile_id: profileId,
                zernio_post_id: actualPostId,
                content: postContent,
                media_urls: postImageUrl ? [postImageUrl] : [],
                status: 'published',
                platforms: [platform || 'unknown'],
                scheduled_for: new Date().toISOString()
              }, { onConflict: 'zernio_post_id' })
              .select('id')
              .single();
            if (newPost) internalPostId = newPost.id;
          }
        }`;

lines.splice(idx, endIdx - idx + 1, newBlock);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Update complete via splice');
