/**
 * Zernio analitik sorgularının kiracı (organizations.id) kapsamı.
 *
 * Zernio tek bir çalışma alanı (workspace) anahtarıyla çağrılır; istemciden gelen
 * sorgu olduğu gibi SDK'ya gitmemelidir. Bu modül:
 *  - istemci sorgusunu izin listesiyle temizler (profileId/accountId istemciden alınmaz),
 *  - kapsamı sunucuda çözülmüş profil/hesaplarla yeniden kurar,
 *  - önbellek anahtarını daima `org:<organizations.id>` ile başlatır.
 */

// İstemcinin gönderebileceği filtreler (kimlik alanları BİLEREK yok).
const ALLOWED_QUERY_KEYS = [
  'fromDate', 'toDate', 'startDate', 'endDate', 'period', 'platform',
  'limit', 'page', 'sortBy', 'order', 'metric', 'metrics', 'granularity',
  'postId', 'timezone', 'days',
] as const;

export interface AnalyticsScope {
  orgId: string;
  /** Kuruluşa ait Zernio profil kimlikleri (integration.zernio_profiles). */
  profileIds: string[];
  /** Kuruluşa ait bağlı hesap kimlikleri (integration.social_accounts.zernio_account_id). */
  accountIds: string[];
}

export function sanitizeAnalyticsQuery(payload: any): Record<string, unknown> {
  const src = { ...(payload && typeof payload === 'object' ? payload : {}), ...((payload && payload.query) || {}) };
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_QUERY_KEYS) {
    const v = (src as any)[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/** Kuruluşun hiçbir profili/hesabı yoksa Zernio'ya HİÇ gidilmez. */
export function scopeIsEmpty(scope: AnalyticsScope): boolean {
  return scope.profileIds.length === 0 && scope.accountIds.length === 0;
}

/**
 * SDK'ya gidecek yük. accountId verilmişse (sahipliği doğrulanmış) yalnız o hesap;
 * verilmemişse kuruluşun (ilk) Zernio profili ile sınırlanır.
 */
export function buildScopedPayload(
  clientPayload: any,
  scope: AnalyticsScope,
  accountId?: string | null,
): Record<string, any> {
  const query: Record<string, any> = sanitizeAnalyticsQuery(clientPayload);
  if (accountId) {
    if (!scope.accountIds.includes(accountId)) {
      throw new Error('Forbidden: Account not owned by this organization.');
    }
    query.accountId = accountId;
  } else if (scope.profileIds.length > 0) {
    query.profileId = scope.profileIds[0];
  } else {
    throw new Error('Scope has no profile or account.');
  }
  // Hem üst düzey hem query: SDK sürümleri farklı yerden okuyabilir.
  const out: Record<string, any> = { ...query, query };
  return out;
}

/** Aynı sorgu parametrelerine aynı anahtar. */
export function queryHash(q: Record<string, unknown>): string {
  const keys = Object.keys(q).sort();
  const s = keys.map((k) => `${k}=${String(q[k])}`).join('&');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** analytics_cache.account_id değeri: her zaman org ile başlar; `global` YOK. */
export function cacheKeyFor(orgId: string, accountId?: string | null): string {
  if (!orgId) throw new Error('orgId required for cache key');
  return accountId ? `org:${orgId}:acc:${accountId}` : `org:${orgId}`;
}

/** analytics_cache.metric_type değeri: sorgu parametrelerini de içerir. */
export function cacheMetricFor(metricType: string, q: Record<string, unknown>): string {
  const h = queryHash(q);
  return Object.keys(q).length ? `${metricType}:${h}` : metricType;
}
