-- ==============================================================================
-- PERSONA ENGINE — remove Mimar Sinan from the roster (permanent)
-- ==============================================================================
-- Business decision: Mimar Sinan is not coming back, so this is a hard delete
-- rather than an archive. Verified before writing this migration that zero
-- organizations have it selected (organization_ai_settings.persona_id has no
-- references to this slug) and no portrait was ever uploaded for it (avatar_
-- url/thumbnail_url were both null) — nothing else references this row.
-- ==============================================================================

DELETE FROM public.ai_personas
WHERE slug = 'mimar-sinan';
