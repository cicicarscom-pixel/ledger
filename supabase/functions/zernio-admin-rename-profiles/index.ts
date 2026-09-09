import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { ZernioClient } from "../shared/infrastructure/clients/ZernioClient.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ADMIN / MAINTENANCE ONLY — not called from any client app.
 *
 * Renames every currently-active Zernio profile's display name (as shown in
 * Zernio's own dashboard) to a human-readable "İşletme Adı — email" label, so
 * the platform admin can identify which real Workigom business/user a profile
 * belongs to (needed to find and ban/force-logout a specific user).
 *
 * Takes NO input from the caller — it always operates on the full set of
 * currently active profiles read straight from our own DB (integration.zernio_profiles),
 * using the exact same labeling rules as zernio-client's get-connect-url flow
 * (see buildReadableProfileLabel there). This makes it safe to leave deployed
 * and idempotently re-run at any time — e.g. after new organizations onboard,
 * or if a business_name/email changes and the Zernio-side label should catch up.
 *
 * It never touches any of our own DB records; we only ever key off zernio_profile_id.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  async function buildReadableProfileLabel(orgId: string, profileSlot: number): Promise<string> {
    let businessName: string | null = null;
    let email: string | null = null;

    try {
      const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).maybeSingle();
      businessName = org?.name || null;

      const { data: member } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (member?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_name, email')
          .eq('id', member.user_id)
          .maybeSingle();
        if (profile?.business_name) businessName = profile.business_name;
        if (profile?.email) email = profile.email;
      }
    } catch (e) {
      console.error(`Failed to resolve readable profile label for org ${orgId}:`, e);
    }

    if (!businessName) businessName = `Org-${orgId.slice(0, 8)}`;

    const base = email ? `${businessName} — ${email}` : businessName;
    return profileSlot > 1 ? `${base} (#${profileSlot})` : base;
  }

  const results: any[] = [];

  try {
    const zernio = new ZernioClient();

    const { data: profiles, error } = await supabase
      .schema('integration')
      .from('zernio_profiles')
      .select('id, organization_id, zernio_profile_id, profile_slot, status')
      .eq('status', 'active');

    if (error) throw error;

    for (const p of profiles || []) {
      const targetName = await buildReadableProfileLabel(p.organization_id, p.profile_slot);
      try {
        await zernio.profiles.updateProfile(p.zernio_profile_id, targetName);
        results.push({
          zernio_profile_id: p.zernio_profile_id,
          organization_id: p.organization_id,
          renamed_to: targetName,
          success: true,
        });
      } catch (e: any) {
        results.push({
          zernio_profile_id: p.zernio_profile_id,
          organization_id: p.organization_id,
          attempted_name: targetName,
          success: false,
          error: e.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error("zernio-admin-rename-profiles error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
