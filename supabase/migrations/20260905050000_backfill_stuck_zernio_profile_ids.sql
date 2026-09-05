-- get-connect-url's "persist the newly-created Zernio profile id back to our DB" step
-- (zernio-client/index.ts, ~line 185) was missing .schema('integration'), so it was
-- silently writing to the (nonexistent) public.zernio_profiles instead of
-- integration.zernio_profiles. Every profile ever created via this path was therefore
-- stuck at status='provisioning' with zernio_profile_id=NULL locally, even though the
-- profile was successfully created on Zernio's side. The next time a different platform
-- was connected for the same org, resolve_zernio_profile_for_platform's "provisioning"
-- fallback found this same stuck row and tried to re-create a profile with the exact
-- same deterministic name on Zernio -- which Zernio rejects once its idempotency-key
-- cache for that name has expired ("A profile with this name already exists", 409).
--
-- Real Zernio profile ids recovered from function_logs (Getting Connect URL for Zernio
-- Profile: <id> log lines) for the two orgs affected so far.
UPDATE integration.zernio_profiles
SET zernio_profile_id = '6a98de50aab7e58f1846456e', status = 'active'
WHERE id = '8c2b2044-14c0-429f-9fb9-12bae65db4a5'
  AND organization_id = '84c54c33-40b4-45fa-a0cc-bb424f3f4609';

UPDATE integration.zernio_profiles
SET zernio_profile_id = '6a99c5926993c5571b15aaa8', status = 'active'
WHERE id = '43c5f2f1-7e30-401c-b7f5-7eb9ec66d051'
  AND organization_id = 'c879d92b-602c-47ac-a948-5d0e5fa9a94b';
