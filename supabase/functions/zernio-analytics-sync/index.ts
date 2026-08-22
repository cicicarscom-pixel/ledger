import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ZernioClient } from "../shared/infrastructure/clients/ZernioClient.ts";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const zernio = new ZernioClient();

    // 1. Get all active social accounts
    const { data: accounts, error: accErr } = await supabase
      .schema('integration')
      .from('social_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('enabled', true);

    if (accErr || !accounts) {
      throw new Error(`Failed to fetch social accounts: ${accErr?.message}`);
    }

    console.log(`Starting Analytics Sync for ${accounts.length} accounts...`);
    
    let successCount = 0;
    let failCount = 0;
    const metricDate = new Date().toISOString().split('T')[0];

    // 2. Sync loop
    for (const account of accounts) {
      try {
        const payload = { accountId: account.zernio_account_id };
        let metrics: any = {
           followers: 0,
           impressions: 0,
           reach: 0,
           engagements: 0,
           posts_count: 0
        };
        let rawData: any = {};

        // Platform specific logic
        switch (account.platform.toLowerCase()) {
          case 'instagram':
            const igRes: any = await zernio.analytics.getInstagramAccountInsights(payload);
            rawData = igRes.data || igRes;
            metrics.followers = rawData.followers || 0;
            metrics.impressions = rawData.impressions || 0;
            metrics.reach = rawData.reach || 0;
            metrics.engagements = (rawData.likes || 0) + (rawData.comments || 0);
            break;
            
          case 'facebook':
            const fbRes: any = await zernio.analytics.getFacebookPageInsights(payload);
            rawData = fbRes.data || fbRes;
            metrics.followers = rawData.page_fans || 0;
            metrics.impressions = rawData.page_impressions || 0;
            break;
            
          case 'youtube':
            const ytRes: any = await zernio.analytics.getYouTubeChannelInsights(payload);
            rawData = ytRes.data || ytRes;
            metrics.followers = rawData.subscriberCount || 0;
            metrics.impressions = rawData.viewCount || 0;
            metrics.posts_count = rawData.videoCount || 0;
            break;
            
          case 'linkedin':
            const liRes: any = await zernio.analytics.getLinkedInOrgAggregateAnalytics(payload);
            rawData = liRes.data || liRes;
            metrics.followers = rawData.followerCount || 0;
            metrics.impressions = rawData.impressions || 0;
            metrics.engagements = rawData.engagements || 0;
            break;
            
          default:
             // Global fallback
             const statRes: any = await zernio.accounts.getFollowerStats(payload);
             rawData = statRes.data || statRes;
             metrics.followers = rawData.totalFollowers || rawData.followers || 0;
             break;
        }

        // 3. Upsert into flow.social_account_metrics
        await supabase
          .schema('flow')
          .from('social_account_metrics')
          .upsert({
            organization_id: account.organization_id,
            social_account_id: account.id,
            metric_date: metricDate,
            followers: metrics.followers,
            impressions: metrics.impressions,
            reach: metrics.reach,
            engagements: metrics.engagements,
            posts_count: metrics.posts_count,
            raw_metrics: rawData,
            synced_at: new Date().toISOString()
          }, { onConflict: 'social_account_id,metric_date' });
          
        successCount++;
      } catch (err: any) {
        console.error(`Failed to sync analytics for account ${account.zernio_account_id}:`, err.message);
        failCount++;
      }
    }

    return new Response(JSON.stringify({ 
        success: true, 
        synced: successCount, 
        failed: failCount 
    }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    
  } catch (error: any) {
    console.error("Zernio Analytics Sync Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
