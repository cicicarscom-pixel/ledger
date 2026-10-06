export async function verifyHmacSha256(rawBody: string, signatureHex: string | null, secret: string): Promise<boolean> {
  if (!signatureHex) return false;

  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secret);
  const dataBuf = encoder.encode(rawBody);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  const expectedSignatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, dataBuf);
  const expectedSignatureHex = Array.from(new Uint8Array(expectedSignatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Normalleştirerek kabul et (büyük/küçük harf farkı olmaması için).
  const sigLower = signatureHex.toLowerCase();

  // Sabit süreli karşılaştırma
  if (expectedSignatureHex.length !== sigLower.length) return false;
  
  let result = 0;
  for (let i = 0; i < expectedSignatureHex.length; i++) {
    result |= expectedSignatureHex.charCodeAt(i) ^ sigLower.charCodeAt(i);
  }
  return result === 0;
}
