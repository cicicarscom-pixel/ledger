-- 1. Create Schemas
CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS flow;

-- 2. Drop legacy table (All existing data is test data and legacy migration is skipped)
DROP TABLE IF EXISTS public.social_accounts CASCADE;

-- 3. Zernio Profiles Table (One organization -> One Primary Profile)
CREATE TABLE integration.zernio_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_profile_id text not null unique,
  profile_key text not null,
  display_name text,
  is_primary boolean not null default false,
  status text not null default 'provisioning',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure only one primary profile per organization
CREATE UNIQUE INDEX idx_integration_zernio_profiles_primary 
ON integration.zernio_profiles (organization_id) 
WHERE is_primary = true;

-- 4. Social Accounts Table
CREATE TABLE integration.social_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_profile_mapping_id uuid not null references integration.zernio_profiles(id) on delete cascade,
  zernio_profile_id text not null,
  zernio_account_id text not null unique,
  platform text not null,
  username text,
  display_name text,
  profile_picture_url text,
  profile_url text,
  is_active boolean default true,
  needs_reconnection boolean default false,
  enabled boolean default true,
  connected_at timestamptz default now(),
  disconnected_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Webhook Events Table (For idempotency and deduplication)
CREATE TABLE integration.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'zernio',
  external_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz default now(),
  processed_at timestamptz,
  status text not null default 'pending',
  error text,
  UNIQUE(provider, external_event_id)
);

-- 6. Analytics Cache Table
CREATE TABLE flow.social_account_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid not null references integration.social_accounts(id) on delete cascade,
  metric_date date not null,
  followers integer default 0,
  impressions integer default 0,
  reach integer default 0,
  engagements integer default 0,
  posts_count integer default 0,
  raw_metrics jsonb,
  synced_at timestamptz default now(),
  UNIQUE(social_account_id, metric_date)
);

-- 7. Row Level Security (RLS)
ALTER TABLE integration.zernio_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow.social_account_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view zernio_profiles of their organization
CREATE POLICY "Users can view zernio_profiles of their organization" 
ON integration.zernio_profiles FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Policy: Users can view social_accounts of their organization
CREATE POLICY "Users can view social_accounts of their organization" 
ON integration.social_accounts FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Policy: Users can view social_account_metrics of their organization
CREATE POLICY "Users can view social_account_metrics of their organization" 
ON flow.social_account_metrics FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Note: Webhook events don't need RLS policies for client as they are backend-only (service_role)
-- Write/Update operations for these tables will be handled securely by Edge Functions via service_role.
