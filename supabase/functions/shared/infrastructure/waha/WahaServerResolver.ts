import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';

export interface WahaServer {
  serverId: string;
  fillOrder: number;
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, serviceRole);

const cache = new Map<string, WahaServer>();

async function buildServer(row: any): Promise<WahaServer> {
  const baseUrl = row.base_url ?? Deno.env.get('WAHA_BASE_URL') ?? '';
  const apiKey = Deno.env.get(row.api_key_secret_name);
  const webhookSecret = Deno.env.get(row.webhook_secret_name);

  if (!apiKey) {
    console.error(`WAHA_SECRET_MISSING:${row.api_key_secret_name}`);
    throw new Error(`WAHA_SECRET_MISSING:${row.api_key_secret_name}`);
  }
  if (!webhookSecret) {
    console.error(`WAHA_SECRET_MISSING:${row.webhook_secret_name}`);
    throw new Error(`WAHA_SECRET_MISSING:${row.webhook_secret_name}`);
  }

  // Ensure trailing /api or remove it for consistency based on standard handling
  let finalBaseUrl = baseUrl;
  if (!finalBaseUrl.endsWith('/api')) {
    finalBaseUrl = finalBaseUrl.endsWith('/') ? `${finalBaseUrl}api` : `${finalBaseUrl}/api`;
  }

  return {
    serverId: row.id,
    fillOrder: row.fill_order,
    baseUrl: finalBaseUrl,
    apiKey,
    webhookSecret
  };
}

export async function resolveForOrg(orgId: string): Promise<WahaServer | null> {
  const cacheKey = `org:${orgId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const { data: assignment, error } = await supabase
    .from('waha_session_assignments')
    .select('server_id, waha_servers(*)')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error || !assignment || !assignment.waha_servers) return null;
  const server = Array.isArray(assignment.waha_servers) ? assignment.waha_servers[0] : assignment.waha_servers;
  if (!server.is_active) throw new Error('WAHA server is inactive');

  const result = await buildServer(server);
  cache.set(cacheKey, result);
  return result;
}

export async function resolveForSession(sessionName: string): Promise<WahaServer | null> {
  const cacheKey = `session:${sessionName}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', sessionName)
    .maybeSingle();

  if (!org) return null;
  const server = await resolveForOrg(org.id);
  if (server) cache.set(cacheKey, server);
  return server;
}

export async function resolveServer(serverId: string): Promise<WahaServer | null> {
  const cacheKey = `server:${serverId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const { data: server, error } = await supabase
    .from('waha_servers')
    .select('*')
    .eq('id', serverId)
    .maybeSingle();

  if (error || !server) return null;
  if (!server.is_active) throw new Error('WAHA server is inactive');

  const result = await buildServer(server);
  cache.set(cacheKey, result);
  return result;
}
