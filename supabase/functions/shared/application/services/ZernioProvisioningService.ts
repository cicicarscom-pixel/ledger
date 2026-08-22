import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { ZernioClient } from "../../infrastructure/clients/ZernioClient.ts";
import { ZernioError } from "../../infrastructure/zernio/ZernioError.ts";

export class ZernioProvisioningService {
  constructor(private supabase: SupabaseClient, private zernio: ZernioClient) {}

  /**
   * Ensures a Zernio Profile exists for the given organization.
   * If it doesn't exist, provisions one via Zernio API and saves the mapping.
   * Uses Idempotency-Key to prevent duplicate profiles during concurrent onboarding.
   */
  async ensureOrganizationProfile(organizationId: string, organizationName: string, userId?: string): Promise<string> {
    if (!organizationId) throw new ZernioError("Organization ID is required", 400);

    // 1. Check if profile already mapped
    const { data: existingProfile, error: dbErr } = await this.supabase
      .schema('integration')
      .from('zernio_profiles')
      .select('zernio_profile_id')
      .eq('organization_id', organizationId)
      .eq('is_primary', true)
      .maybeSingle();

    if (dbErr) {
      console.error("[ZernioProvisioning] Error fetching existing profile mapping:", dbErr);
      throw new ZernioError("Veritabanından profil bilgisi alınamadı.", 500, "PROFILE_PROVISION_FAILED");
    }

    if (existingProfile && existingProfile.zernio_profile_id) {
      return existingProfile.zernio_profile_id; // Already provisioned
    }

    // 2. Provision new profile via Zernio SDK
    console.log(`[ZernioProvisioning] Provisioning new Zernio Profile for Org: ${organizationId}`);
    const idempotencyKey = `wg-zernio-profile:${organizationId}:primary`;
    const profileKey = `org_${organizationId.replace(/-/g, '').substring(0, 10)}`;
    const displayName = `${organizationName} (Auto-Provisioned)`;

    let zernioProfileId: string;
    try {
      const profileRes: any = await this.zernio.profiles.createProfile(displayName, idempotencyKey);
      zernioProfileId = profileRes.data?.profile?.id || profileRes.data?.id || profileRes.id;
      
      if (!zernioProfileId) {
          throw new Error("SDK response did not contain a valid profile ID");
      }
    } catch (apiErr: any) {
      console.error("[ZernioProvisioning] Zernio API Error:", apiErr);
      throw new ZernioError("İşletme profili sağlayıcıda oluşturulamadı.", 500, "PROFILE_PROVISION_FAILED", apiErr);
    }

    // 3. Save mapping to database
    const { error: insertErr } = await this.supabase
      .schema('integration')
      .from('zernio_profiles')
      .insert({
        organization_id: organizationId,
        zernio_profile_id: zernioProfileId,
        profile_key: profileKey,
        display_name: displayName,
        is_primary: true,
        status: 'active',
        created_by: userId || null
      });

    // If duplicate insert occurs (e.g. race condition), catch and fallback to the created one
    if (insertErr) {
      if (insertErr.code === '23505') { // Unique constraint violation
        console.warn(`[ZernioProvisioning] Race condition handled for org: ${organizationId}`);
        const { data: fallbackProfile } = await this.supabase
          .schema('integration')
          .from('zernio_profiles')
          .select('zernio_profile_id')
          .eq('organization_id', organizationId)
          .eq('is_primary', true)
          .maybeSingle();
          
        if (fallbackProfile) return fallbackProfile.zernio_profile_id;
      }
      console.error("[ZernioProvisioning] DB Insert Error:", insertErr);
      throw new ZernioError("İşletme profili eşleştirmesi kaydedilemedi.", 500, "PROFILE_PROVISION_FAILED");
    }

    return zernioProfileId;
  }
}
