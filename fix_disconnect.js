const fs = require('fs');
const file = 'supabase/functions/zernio-client/index.ts';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const idx = 1084;
const endIdx = 1097;

const newBlock = `      case 'disconnect-account': {
        const { accountId } = payload;
        if (!accountId) throw new ZernioError("Missing accountId", 400);

        try {
          await zernio.accounts.disconnectAccount(accountId);
        } catch (accountError: any) {
          // Zernio hesabı kendi tarafında zaten "bulamıyorsa" (404 / "not found"), bu
          // hesabın Zernio'da da zaten kopmuş/silinmiş olduğu anlamına gelir — özellikle
          // needs_reconnection=true ("Yeniden Bağlan") kartları için tipik bir durum.
          // Bu durumda silme işlemini engellemek yerine Workigom tarafındaki bozuk kaydı
          // temizlemeye devam ediyoruz; aksi halde kullanıcı çöp kutusuna basıp basıp
          // hiçbir şey olmadığını görüyor (16.09.2026'da DISCONNECT_ACCOUNT_FAILED /
          // "Account not found" logları ve haftalardır silinmemiş 6 adet needs_reconnection
          // kaydı ile doğrulandı). Başka türden bir hata (auth, rate limit, ağ vb.) için
          // eski davranış korunuyor — aktif bir bağlantıyı yanlışlıkla yerelden silmeyelim.
          const rawMessage = String(accountError?.message || '');
          const looksAlreadyGone = accountError?.status === 404 || /not found/i.test(rawMessage);
          if (!looksAlreadyGone) {
            throw new ZernioError("Zernio disconnectAccount Hatası: " + accountError.message, accountError.status, 'DISCONNECT_ACCOUNT_FAILED');
          }
          console.warn(\`[disconnect-account] Zernio hesabı zaten bulamadı (muhtemelen zaten kopmuş bağlantı), yerel kayıt yine de siliniyor. accountId: \${accountId}\`);
        }
        await supabase.schema('integration').from('social_accounts').delete().eq('zernio_account_id', accountId);

        result = { success: true };
        break;
      }`;

lines.splice(idx, endIdx - idx + 1, newBlock);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Update complete via splice');
