export async function verifyWahaHmac(rawBody: string, signatureHex: string | null, secret: string): Promise<boolean> {
  if (!signatureHex) return false;

  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secret);
  const dataBuf = encoder.encode(rawBody);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign", "verify"]
  );

  const expectedSignatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, dataBuf);
  const expectedSignatureHex = Array.from(new Uint8Array(expectedSignatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (expectedSignatureHex.length !== signatureHex.length) return false;
  
  let result = 0;
  for (let i = 0; i < expectedSignatureHex.length; i++) {
    result |= expectedSignatureHex.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  }
  return result === 0;
}

export function isLegacyWindowOpen(now = new Date()): boolean {
  const untilStr = Deno.env.get('WAHA_LEGACY_WEBHOOK_UNTIL');
  if (!untilStr) return false;
  
  const until = new Date(untilStr);
  if (isNaN(until.getTime())) return false;
  
  return now.getTime() < until.getTime();
}
