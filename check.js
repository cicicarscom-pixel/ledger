const fs = require('fs');
const lines = fs.readFileSync('supabase/functions/zernio-client/index.ts', 'utf8').split(/\r?\n/);
const idx = lines.findIndex(l => l.includes("case 'disconnect-account':"));
for (let i = idx; i < idx + 20; i++) console.log(i + ': ' + lines[i]);
