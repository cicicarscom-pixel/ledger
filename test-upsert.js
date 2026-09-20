const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://qybzidylewzsnmlofjul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5YnppZHlsZXd6c25tbG9manVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTk3MTMsImV4cCI6MjA5NTgzNTcxM30.WNnzSFMEueVJg_TLaWXdpkadKkw-fJk0vSyNBdHbPrU');

async function test() {
  const { data, error } = await supabase.from('posts').upsert({ zernio_post_id: 'test' }, { onConflict: 'zernio_post_id' });
  console.log(error);
}
test();
