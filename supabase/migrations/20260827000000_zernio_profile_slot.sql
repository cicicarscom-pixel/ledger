-- 1. Make zernio_profile_id nullable to allow provisioning reservations
ALTER TABLE integration.zernio_profiles ALTER COLUMN zernio_profile_id DROP NOT NULL;

-- 2. Add profile_slot integer
ALTER TABLE integration.zernio_profiles ADD COLUMN IF NOT EXISTS profile_slot integer;

-- 3. Set existing profile_slots to 1
UPDATE integration.zernio_profiles SET profile_slot = 1 WHERE profile_slot IS NULL;

-- 4. Enforce NOT NULL and Unique constraint
ALTER TABLE integration.zernio_profiles ALTER COLUMN profile_slot SET NOT NULL;
ALTER TABLE integration.zernio_profiles ADD CONSTRAINT zernio_profiles_org_slot_key UNIQUE (organization_id, profile_slot);

-- 5. Add soft delete column to social_accounts
ALTER TABLE integration.social_accounts ADD COLUMN IF NOT EXISTS sync_missing_since timestamptz;

-- 6. Create RPC Type and Function for Concurrent-Safe Profile Resolution
DROP TYPE IF EXISTS zernio_profile_resolution CASCADE;
CREATE TYPE zernio_profile_resolution AS (
  profile_slot integer,
  is_new boolean,
  zernio_profile_id text,
  mapping_id uuid
);

CREATE OR REPLACE FUNCTION resolve_zernio_profile_for_platform(p_org_id uuid, p_platform text)
RETURNS zernio_profile_resolution
LANGUAGE plpgsql
AS $$
DECLARE
  v_slot integer;
  v_zernio_id text;
  v_mapping_id uuid;
  v_res zernio_profile_resolution;
BEGIN
  -- Obtain advisory lock on the organization ID to prevent concurrent allocations
  PERFORM pg_advisory_xact_lock(hashtext(p_org_id::text));
  
  -- Check if there's any active slot that doesn't have this platform connected
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

  -- Check if there is already a provisioning slot we can reuse (failed edge function)
  SELECT zp.profile_slot, zp.id INTO v_slot, v_mapping_id
  FROM integration.zernio_profiles zp
  WHERE zp.organization_id = p_org_id
    AND zp.status = 'provisioning'
  ORDER BY zp.profile_slot ASC
  LIMIT 1;

  IF v_slot IS NULL THEN
    -- If not found, determine next slot
    SELECT COALESCE(MAX(profile_slot), 0) + 1 INTO v_slot
    FROM integration.zernio_profiles
    WHERE organization_id = p_org_id;

    -- Insert a reservation record
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
$$;
