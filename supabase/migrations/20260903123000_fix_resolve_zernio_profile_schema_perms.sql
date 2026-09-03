-- resolve_zernio_profile_for_platform was created as a plain (SECURITY INVOKER)
-- function, so when called via PostgREST/RPC by service_role it ran with
-- service_role's own privileges — which lack any grant on the `integration`
-- schema. That produced Postgres error 42501 "permission denied for schema
-- integration" every time zernio-client tried to resolve/create a profile slot.
--
-- Fix: make it SECURITY DEFINER (runs as the function owner, who has full
-- access) and pin search_path explicitly, mirroring the existing
-- get_active_social_accounts_for_sync() convention.
CREATE OR REPLACE FUNCTION public.resolve_zernio_profile_for_platform(p_org_id uuid, p_platform text)
 RETURNS zernio_profile_resolution
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'integration', 'public'
AS $function$
DECLARE
  v_slot integer;
  v_zernio_id text;
  v_mapping_id uuid;
  v_res zernio_profile_resolution;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_org_id::text));

  SELECT zp.profile_slot, zp.zernio_profile_id, zp.id INTO v_slot, v_zernio_id, v_mapping_id
  FROM integration.zernio_profiles zp
  LEFT JOIN integration.social_accounts sa
    ON sa.zernio_profile_mapping_id = zp.id AND sa.platform = p_platform AND sa.is_active = true
  WHERE zp.organization_id = p_org_id
    AND sa.id IS NULL
    AND zp.status = 'active'
  ORDER BY zp.profile_slot ASC
  LIMIT 1;

  IF v_slot IS NOT NULL THEN
    v_res.profile_slot := v_slot;
    v_res.is_new := false;
    v_res.zernio_profile_id := v_zernio_id;
    v_res.mapping_id := v_mapping_id;
    RETURN v_res;
  END IF;

  SELECT zp.profile_slot, zp.id INTO v_slot, v_mapping_id
  FROM integration.zernio_profiles zp
  WHERE zp.organization_id = p_org_id
    AND zp.status = 'provisioning'
  ORDER BY zp.profile_slot ASC
  LIMIT 1;

  IF v_slot IS NULL THEN
    SELECT COALESCE(MAX(profile_slot), 0) + 1 INTO v_slot
    FROM integration.zernio_profiles
    WHERE organization_id = p_org_id;

    INSERT INTO integration.zernio_profiles
      (organization_id, profile_slot, profile_key, is_primary, status)
    VALUES
      (p_org_id, v_slot, 'slot_' || v_slot, v_slot = 1, 'provisioning')
    RETURNING id INTO v_mapping_id;
  END IF;

  v_res.profile_slot := v_slot;
  v_res.is_new := true;
  v_res.zernio_profile_id := null;
  v_res.mapping_id := v_mapping_id;
  RETURN v_res;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.resolve_zernio_profile_for_platform(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_zernio_profile_for_platform(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_zernio_profile_for_platform(uuid, text) TO authenticated, service_role;
