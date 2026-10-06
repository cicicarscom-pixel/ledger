import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { verifyHmacSha256 } from "../shared/infrastructure/waha/metricsAuth.ts";

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
  }

  const lengthStr = req.headers.get("content-length");
  if (lengthStr && parseInt(lengthStr, 10) > 2048) {
    return new Response(JSON.stringify({ error: "Payload Too Large" }), { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
  }

  if (rawBody.length > 2048) {
    return new Response(JSON.stringify({ error: "Payload Too Large" }), { status: 413 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
  }

  const { serverId, ts, cpuPercent, memUsedMb, memTotalMb } = payload;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (typeof serverId !== 'string' || !uuidRegex.test(serverId)) return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
  if (typeof ts !== 'number' || !Number.isInteger(ts)) return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
  if (typeof cpuPercent !== 'number' || cpuPercent < 0 || cpuPercent > 100) return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
  if (typeof memUsedMb !== 'number' || !Number.isInteger(memUsedMb) || memUsedMb < 0 || memUsedMb > 10000000) return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
  if (typeof memTotalMb !== 'number' || !Number.isInteger(memTotalMb) || memTotalMb < 0 || memTotalMb > 10000000) return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
  if (memUsedMb > memTotalMb) return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });

  const nowTs = Math.floor(Date.now() / 1000);
  if (Math.abs(nowTs - ts) > 300) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: server, error: sErr } = await supabaseClient
    .from("waha_servers")
    .select("fill_order, is_active")
    .eq("id", serverId)
    .single();

  if (sErr || !server || !server.is_active) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const secretName = `WAHA_METRICS_SECRET_${server.fill_order}`;
  const secret = Deno.env.get(secretName);
  if (!secret) {
    console.error(`SERVER_MISCONFIGURED: Missing secret ${secretName}`);
    return new Response(JSON.stringify({ error: "SERVER_MISCONFIGURED" }), { status: 500 });
  }

  const signatureHex = req.headers.get("x-metrics-signature");
  const isValid = await verifyHmacSha256(rawBody, signatureHex, secret);

  if (!isValid) {
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const { data: recentAlerts } = await supabaseClient
      .from("waha_alerts")
      .select("id")
      .eq("server_id", serverId)
      .eq("kind", "webhook_auth_failed")
      .is("resolved_at", null)
      .gte("created_at", oneHourAgo)
      .limit(1);

    if (!recentAlerts || recentAlerts.length === 0) {
      await supabaseClient.from("waha_alerts").insert({
        server_id: serverId,
        kind: "webhook_auth_failed",
        message: "Metrik imzası doğrulanamadı"
      });
    }

    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const tenMinsAgo = new Date(Date.now() - 600 * 1000).toISOString();
  const { data: recentMetric } = await supabaseClient
    .from("waha_server_metrics")
    .select("id")
    .eq("server_id", serverId)
    .gte("measured_at", tenMinsAgo)
    .order("measured_at", { ascending: false })
    .limit(1);

  if (recentMetric && recentMetric.length > 0) {
    await supabaseClient
      .from("waha_server_metrics")
      .update({
        cpu_percent: cpuPercent,
        mem_used_mb: memUsedMb,
        mem_total_mb: memTotalMb
      })
      .eq("id", recentMetric[0].id);
  } else {
    await supabaseClient
      .from("waha_server_metrics")
      .insert({
        server_id: serverId,
        cpu_percent: cpuPercent,
        mem_used_mb: memUsedMb,
        mem_total_mb: memTotalMb
      });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
