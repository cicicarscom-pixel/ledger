'use client';

import { useState } from 'react';
import { setAcceptingNew, setMaxSessions, refreshWebhooks } from './actions';

export function ServerActions({ server }: { server: any }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [showCapModal, setShowCapModal] = useState(false);
  const [capInput, setCapInput] = useState(server.max_sessions.toString());
  const [capConfirm, setCapConfirm] = useState(false);

  const handleToggleAccepting = async () => {
    setLoading(true);
    setMessage('');
    const res = await setAcceptingNew(server.id, !server.accepting_new);
    setMessage(res.message);
    setLoading(false);
  };

  const handleRefreshWebhooks = async () => {
    if (!confirm(`Bu sunucudaki ${server.assigned} atamanın webhook ayarı güncellenecek. WhatsApp bağlantıları kopmaz, QR gerekmez. Devam edilsin mi?`)) return;
    
    setLoading(true);
    setMessage('');
    const res = await refreshWebhooks(server.id);
    setMessage(res.message);
    setLoading(false);
  };

  const handleCapSubmit = async () => {
    const val = parseInt(capInput, 10);
    if (isNaN(val) || val < 1 || val > 100000) {
      alert("Lütfen 1 ile 100000 arası geçerli bir tam sayı girin.");
      return;
    }

    if (val < server.assigned && !capConfirm) {
      setCapConfirm(true);
      return;
    }

    setLoading(true);
    setMessage('');
    const res = await setMaxSessions(server.id, val);
    setMessage(res.message);
    setLoading(false);
    setShowCapModal(false);
    setCapConfirm(false);
  };

  return (
    <div className="flex flex-col gap-2 items-end text-sm">
      <div className="flex gap-2">
        <button
          disabled={loading}
          onClick={handleToggleAccepting}
          className="text-primary hover:underline disabled:opacity-50"
        >
          {server.accepting_new ? 'Yeni kayıt almayı durdur' : 'Yeni kayıt almayı aç'}
        </button>
        <button
          disabled={loading}
          onClick={() => setShowCapModal(true)}
          className="text-primary hover:underline disabled:opacity-50"
        >
          Kapasiteyi değiştir
        </button>
        <button
          disabled={loading}
          onClick={handleRefreshWebhooks}
          className="text-primary hover:underline disabled:opacity-50"
        >
          Webhook ayarını yenile
        </button>
      </div>

      {message && <div className={message.includes('başarısız') ? 'text-danger' : 'text-success'}>{message}</div>}

      {showCapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Kapasiteyi Değiştir</h3>
            <input 
              type="number"
              value={capInput}
              onChange={e => {
                setCapInput(e.target.value);
                setCapConfirm(false);
              }}
              className="w-full bg-background border border-border rounded p-2 mb-4 text-text-muted"
            />
            {capConfirm && (
              <p className="text-danger text-sm mb-4">
                Bu sunucuda şu an {server.assigned} oturum açma kaydı var. Daha düşük bir değer yenilendiğinde yeni kayıtlar durdurulur ama mevcut oturum açma işlemleri durdurulmaz. Yine de kaydetmek istiyor musunuz?
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCapModal(false)} className="text-text-muted hover:underline">İptal</button>
              <button 
                onClick={handleCapSubmit}
                disabled={loading}
                className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {capConfirm ? 'Yine de kaydet' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
