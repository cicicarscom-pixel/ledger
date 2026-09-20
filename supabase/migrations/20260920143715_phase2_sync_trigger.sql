-- Trigger 1: Sync from profiles to organizations
CREATE OR REPLACE FUNCTION public.sync_business_name_to_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.business_name IS DISTINCT FROM OLD.business_name THEN
    UPDATE public.organizations
    SET name = NEW.business_name
    WHERE owner_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_business_name_to_org ON public.profiles;
CREATE TRIGGER trg_sync_business_name_to_org
AFTER UPDATE OF business_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_business_name_to_org();

-- Trigger 2: Sync from organizations to profiles
CREATE OR REPLACE FUNCTION public.sync_org_name_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.profiles
    SET business_name = NEW.name
    WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_org_name_to_profile ON public.organizations;
CREATE TRIGGER trg_sync_org_name_to_profile
AFTER UPDATE OF name ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.sync_org_name_to_profile();
