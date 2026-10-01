// Kök dizin haritası denetimi: Git'te takip edilen her kök öğe STRUCTURE.md tablosunda olmalı;
// tablodaki her öğe de gerçekten var olmalı. Kullanım: node scripts/ci/check-root-map.mjs
// Kök dizine yeni klasör/dosya eklemek için önce STRUCTURE.md'ye satır ekle.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

if (!fs.existsSync('STRUCTURE.md')) { console.log('HATA: STRUCTURE.md yok'); process.exit(1); }
const map = new Set(
  [...fs.readFileSync('STRUCTURE.md', 'utf8').matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((m) => m[1].replace(/\/$/, '')),
);
const tracked = new Set(
  execSync('git -c core.quotepath=off ls-files', { encoding: 'utf8' })
    .split('\n').filter(Boolean).map((p) => p.split('/')[0]),
);
const missing = [...tracked].filter((x) => !map.has(x)).sort();
const stale = [...map].filter((x) => !tracked.has(x)).sort();
console.log(`Kök öğe: ${tracked.size}, haritadaki öğe: ${map.size}`);
if (missing.length) console.log('HARİTADA YOK (STRUCTURE.md\'ye ekle ya da kaldır): ' + missing.join(', '));
if (stale.length) console.log('HARİTADA VAR AMA DEPODA YOK (satırı sil): ' + stale.join(', '));
if (missing.length || stale.length) { console.log('HATA: kök dizin haritası güncel değil'); process.exit(1); }
console.log('OK: kök dizin haritası güncel');
