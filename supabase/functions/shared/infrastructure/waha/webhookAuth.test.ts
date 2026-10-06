import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { verifyWahaHmac, isLegacyWindowOpen } from "./webhookAuth.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

async function generateSignature(body: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const buf = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return encodeHex(buf);
}

Deno.test("verifyWahaHmac - doğru imza geçer", async () => {
  const secret = "my_secret_key";
  const body = '{"event":"message","payload":{}}';
  const sig = await generateSignature(body, secret);
  assertEquals(await verifyWahaHmac(body, sig, secret), true);
});

Deno.test("verifyWahaHmac - yanlış imza reddedilir", async () => {
  const secret = "my_secret_key";
  const body = '{"event":"message"}';
  const sig = await generateSignature(body, "wrong_secret");
  assertEquals(await verifyWahaHmac(body, sig, secret), false);
});

Deno.test("verifyWahaHmac - imza yok reddedilir", async () => {
  const secret = "secret";
  const body = '{"event":"message"}';
  assertEquals(await verifyWahaHmac(body, null, secret), false);
  assertEquals(await verifyWahaHmac(body, "", secret), false);
});

Deno.test("verifyWahaHmac - gövde bir bayt değişince reddedilir", async () => {
  const secret = "secret";
  const body = '{"event":"message"}';
  const sig = await generateSignature(body, secret);
  const tamperedBody = '{"event":"message "}';
  assertEquals(await verifyWahaHmac(tamperedBody, sig, secret), false);
});

Deno.test("isLegacyWindowOpen - geçiş penceresi açık", () => {
  Deno.env.set('WAHA_LEGACY_WEBHOOK_UNTIL', '2026-10-20T00:00:00Z');
  assertEquals(isLegacyWindowOpen(new Date('2026-10-15T00:00:00Z')), true);
});

Deno.test("isLegacyWindowOpen - geçiş penceresi kapalı", () => {
  Deno.env.set('WAHA_LEGACY_WEBHOOK_UNTIL', '2026-10-20T00:00:00Z');
  assertEquals(isLegacyWindowOpen(new Date('2026-10-21T00:00:00Z')), false);
});
