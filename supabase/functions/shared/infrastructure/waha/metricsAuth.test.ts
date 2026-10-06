import { assertEquals } from "https://deno.land/std@0.182.0/testing/asserts.ts";
import { verifyHmacSha256 } from "./metricsAuth.ts";

Deno.test("verifyHmacSha256 - doğru imza geçer", async () => {
  const body = '{"serverId":"test"}';
  const secret = 'my-secret-key';
  
  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secret);
  const dataBuf = encoder.encode(body);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, dataBuf);
  const sigHex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  const result = await verifyHmacSha256(body, sigHex, secret);
  assertEquals(result, true);
});

Deno.test("verifyHmacSha256 - yanlış imza reddedilir", async () => {
  const result = await verifyHmacSha256('{"serverId":"test"}', "badsignature123", "my-secret-key");
  assertEquals(result, false);
});

Deno.test("verifyHmacSha256 - imza yok reddedilir", async () => {
  const result = await verifyHmacSha256('{"serverId":"test"}', null, "my-secret-key");
  assertEquals(result, false);
});

Deno.test("verifyHmacSha256 - gövde bir bayt değişince reddedilir", async () => {
  const body = '{"serverId":"test"}';
  const secret = 'my-secret-key';
  
  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secret);
  const dataBuf = encoder.encode(body);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, dataBuf);
  const sigHex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  const result = await verifyHmacSha256('{"serverId":"tesu"}', sigHex, secret);
  assertEquals(result, false);
});

Deno.test("verifyHmacSha256 - farklı uzunlukta imza reddedilir", async () => {
  const body = '{"serverId":"test"}';
  const secret = 'my-secret-key';
  
  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secret);
  const dataBuf = encoder.encode(body);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, dataBuf);
  const sigHex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('') + 'aa';

  const result = await verifyHmacSha256(body, sigHex, secret);
  assertEquals(result, false);
});

Deno.test("verifyHmacSha256 - büyük/küçük harf farkı olan imza normalleştirilerek kabul edilir", async () => {
  const body = '{"serverId":"test"}';
  const secret = 'my-secret-key';
  
  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secret);
  const dataBuf = encoder.encode(body);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, dataBuf);
  const sigHex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  const result = await verifyHmacSha256(body, sigHex.toUpperCase(), secret);
  assertEquals(result, true);
});
