const fs = require('fs');

const file_path = 'supabase/functions/zernio-client/index.ts';
let content = fs.readFileSync(file_path, 'utf8');

content = content.replace(
  'needs_reconnection: false,',
  'needs_reconnection: acc.needsReconnection === true,'
);

fs.writeFileSync(file_path, content);
