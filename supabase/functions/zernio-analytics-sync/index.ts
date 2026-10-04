import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ZernioClient } from "../shared/infrastructure/clients/ZernioClient.ts";
import { mapFollowerStats, mapInsights, ymdInTimezone, type MappedMetrics } from "../shared/infrastructure/zernio/analyticsMapping.ts";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const providedToken = authHeader.replace('Bearer ', '');
    if (providedToken !== supabaseKey) {
      return new Response(JSON.stringify({ error: "Forbidden: service-role only" }), { status: 403 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const zernio = new ZernioClient();

    // 1. Get all active social accounts
    const { data: accounts, error: accErr } = await supabase
      .rpc('get_active_social_accounts_for_sync');

    if (accErr || !accounts) {
      throw new Error(`Failed to fetch social accounts: ${accErr?.message}`);
    }

    console.log(`Starting Analytics Sync for ${accounts.length} accounts...`);
    
    let successCount = 0;
    let failCount = 0;
    const failures: { platform: string; error: string }[] = [];
    const metricDate = ymdInTimezone(new Date());

    // SDK hey-api biçimi: { query: {...} } ve { data, error } döner (atmaz).
    const unwrap = (res: any) => {
      if (res?.error) throw new Error(typeof res.error === 'string' ? res.error : (res.error?.message ?? JSON.stringify(res.error)).slice(0, 300));
      return res?.data ?? res;
    };

    for (const account of accounts) {
      try {
        const accountId: string = account.zernio_account_id;
        const platform = String(account.platform ?? '').toLowerCase();
        const errors: string[] = [];

        let followers: Partial<MappedMetrics> = {};
        let insights: Partial<MappedMetrics> = {};
        let raw: Record<string, unknown> = {};

        try {
          const fs = unwrap(await zernio.accounts.getFollowerStats({ query: { accountIds: accountId } }));
          followers = mapFollowerStats(fs, accountId);
          raw.followerStats = fs;
        } catch (e: any) { errors.push(`followerStats: ${e.message}`); }

        const insightCall: Record<string, (p: any) => Promise<any>> = {
          instagram: (p) => zernio.analytics.getInstagramAccountInsights(p),
          facebook: (p) => zernio.analytics.getFacebookPageInsights(p),
          youtube: (p) => zernio.analytics.getYouTubeChannelInsights(p),
        };
        if (insightCall[platform]) {
          try {
            const ins = unwrap(await insightCall[platform]({ query: { accountId } }));
            insights = mapInsights(platform, ins);
            raw.insights = ins;
          } catch (e: any) { errors.push(`insights: ${e.message}`); }
        }

        const m = { ...followers, ...insights } as Partial<MappedMetrics>;
        const gotAny = Object.values(m).some((v) => v !== null && v !== undefined);
        if (!gotAny) throw new Error(errors.join(' | ') || 'no metrics returned');
        if (errors.length) console.warn(`Partial analytics for ${platform}:`, errors.join(' | '));

        // flow şeması service_role'e PostgREST'ten açık değil → SECURITY DEFINER RPC.
        const { error: upsertErr } = await supabase.rpc('upsert_social_account_metrics', {
          p_social_account_id: account.id,
          p_metric_date: metricDate,
          p_followers: m.followers ?? null,
          p_impressions: m.impressions ?? null,
          p_reach: m.reach ?? null,
          p_engagements: m.engagements ?? null,
          p_posts_count: m.posts_count ?? null,
          p_raw_metrics: raw,
        });
        if (upsertErr) throw new Error(`metrics upsert failed: ${upsertErr.message}`);

        successCount++;
      } catch (err: any) {
        console.error(`Failed to sync analytics for account ${account.zernio_account_id}:`, err.message);
        failures.push({ platform: String(account.platform ?? ''), error: String(err.message).slice(0, 300) });
        failCount++;
      }
    }

    return new Response(JSON.stringify({ 
        success: true, 
        synced: successCount, 
        failed: failCount,
        failures 
    }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    
  } catch (error: any) {
    console.error("Zernio Analytics Sync Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
