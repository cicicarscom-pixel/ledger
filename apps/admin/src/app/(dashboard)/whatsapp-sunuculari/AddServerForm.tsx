'use client';

import { useState } from 'react';
import { addServer, testConnection } from './actions';

export function AddServerForm({ highestOrder }: { highestOrder: number }) {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKeyName, setApiKeyName] = useState('');
  const [webhookSecretName, setWebhookSecretName] = useState('');
  const [fillOrder, setFillOrder] = useState((highestOrder + 1).toString());
  const [maxSessions, setMaxSessions] = useState('300');
  const [warnPercent, setWarnPercent] = useState('80');
  
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ok: boolean, msg: string} | null>(null);
  const [forceSave, setForceSave] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ok: boolean, text: string} | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setTestResult(null);
    const res = await testConnection({ baseUrl, apiKeySecretName: apiKeyName });
    setTestResult({ ok: res.ok, msg: res.message });
    setLoading(false);
    if (!res.ok) setForceSave(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (testResult && !testResult.ok && !forceSave) {
      // Need checkbox confirmation to save anyway
      return;
    }
    
    setLoading(true);
    setSubmitMessage(null);
    const res = await addServer({
      p_name: name,
      p_base_url: baseUrl,
      p_api_key_secret_name: apiKeyName,
      p_webhook_secret_name: webhookSecretName,
      p_fill_order: parseInt(fillOrder, 10),
      p_max_sessions: parseInt(maxSessions, 10),
      p_warn_percent: parseInt(warnPercent, 10)
    });
    
    setSubmitMessage({ ok: res.ok, text: res.message });
    setLoading(false);

    if (res.ok) {
      setName('');
      setBaseUrl('');
      setApiKeyName('');
      setWebhookSecretName('');
      setFillOrder((parseInt(fillOrder, 10) + 1).toString());
      setTestResult(null);
      setForceSave(false);
    }
  };

  return (
    <div className="bg-card border border-border p-6 rounded-2xl mb-8">
      <h2 className="text-xl font-bold mb-4">Yeni Sunucu Ekle</h2>
      
      <div className="bg-background border border-border p-4 rounded-lg mb-6 text-sm text-text-muted">
        Sunucuyu kaydetmeden önce Supabase → Edge Functions → Secrets bölümüne iki secret ekleyin: API anahtarı ve webhook (HMAC) anahtarı. Burada yalnız secret adları girilir; değerler asla bu forma girilmez.
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 text-text-muted">Ad (Örn: WAHA-2)</label>
          <input required maxLength={80} value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border border-border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-text-muted">Adres (base_url)</label>
          <input required type="url" placeholder="https://..." value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="w-full bg-background border border-border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-text-muted">API Gizli Adı</label>
          <input required pattern="^[A-Z][A-Z0-9_]{2,63}$" placeholder="Örn: WAHA_API_KEY_2" value={apiKeyName} onChange={e => setApiKeyName(e.target.value)} className="w-full bg-background border border-border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-text-muted">Webhook Gizli Adı</label>
          <input required pattern="^[A-Z][A-Z0-9_]{2,63}$" placeholder="Örn: WAHA_WEBHOOK_SECRET_2" value={webhookSecretName} onChange={e => setWebhookSecretName(e.target.value)} className="w-full bg-background border border-border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-text-muted">Sıra (fill_order)</label>
          <input required type="number" min="1" value={fillOrder} onChange={e => setFillOrder(e.target.value)} className="w-full bg-background border border-border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-text-muted">Kapasite (max_sessions)</label>
          <input required type="number" min="1" value={maxSessions} onChange={e => setMaxSessions(e.target.value)} className="w-full bg-background border border-border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-text-muted">Uyarı Yüzdesi (%)</label>
          <input required type="number" min="1" max="100" value={warnPercent} onChange={e => setWarnPercent(e.target.value)} className="w-full bg-background border border-border rounded p-2" />
        </div>
        
        <div className="md:col-span-2 flex flex-col gap-4 mt-2">
          {testResult && (
            <div className={`p-3 rounded border ${testResult.ok ? 'bg-success/10 border-success text-success' : 'bg-danger/10 border-danger text-danger'}`}>
              {testResult.ok ? '✔ ' : '✘ '}{testResult.msg}
            </div>
          )}
          
          {testResult && !testResult.ok && (
            <label className="flex items-center gap-2 text-sm text-warning">
              <input type="checkbox" checked={forceSave} onChange={e => setForceSave(e.target.checked)} />
              Bağlantı testi başarısız; yine de kaydetmek istiyorum.
            </label>
          )}

          {submitMessage && (
            <div className={submitMessage.ok ? 'text-success' : 'text-danger'}>{submitMessage.text}</div>
          )}

          <div className="flex gap-4">
            <button type="button" onClick={handleTest} disabled={loading || !baseUrl || !apiKeyName} className="bg-background border border-border text-text-muted px-4 py-2 rounded hover:bg-border disabled:opacity-50">
              Bağlantıyı Test Et
            </button>
            <button type="submit" disabled={loading || (testResult !== null && !testResult.ok && !forceSave)} className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50">
              Kaydet
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
