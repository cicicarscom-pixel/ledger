import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  const logs = [];
  logs.push('--- 4 SCENARIO TEST ---');

  const testUser = async (email, type, viaGoogle) => {
     logs.push(`\nTesting: ${email} (Type: ${type}, Google: ${viaGoogle})`);
     
     // 1. Create user
     let userId;
     if (viaGoogle) {
        // Simulate google signup (no user_type passed)
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
           email,
           password: 'password123',
           email_confirm: true,
           user_metadata: { full_name: 'Test ' + type, provider: 'google' }
        });
        if (error) { logs.push(`Error: ${error.message}`); return; }
        userId = data.user.id;
     } else {
        // Simulate email signup (passes user_type)
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
           email,
           password: 'password123',
           email_confirm: true,
           user_metadata: { full_name: 'Test ' + type, user_type: type }
        });
        if (error) { logs.push(`Error: ${error.message}`); return; }
        userId = data.user.id;
     }

     // Wait for trigger
     await new Promise(r => setTimeout(r, 1000));

     // 2. Simulate Callback Route (which we built for Flow and Ledger)
     const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
     if (!profile) { logs.push('Profile missing!'); return; }
     
     let createdOrg = false;
     let updatedType = profile.user_type;
     if (viaGoogle) {
         if (type === 'business') {
            if (!profile.user_type) {
               await supabaseAdmin.from('profiles').update({ user_type: 'business' }).eq('id', userId);
               await supabaseAdmin.from('organizations').insert({ owner_id: userId, name: null });
               updatedType = 'business';
            }
         } else if (type === 'accountant') {
            if (!profile.user_type) {
               await supabaseAdmin.from('profiles').update({ user_type: 'accountant' }).eq('id', userId);
               updatedType = 'accountant';
               // Notice: no org created for accountant callback
            }
         }
     }

     // 3. Verify
     const { data: finalProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
     const { data: orgs } = await supabaseAdmin.from('organizations').select('*').eq('owner_id', userId);
     
     logs.push(`Result - User Type: ${finalProfile.user_type}, Org Count: ${orgs.length}`);
     if (finalProfile.user_type === type && (type === 'business' ? orgs.length === 1 : orgs.length === 0)) {
         logs.push('✅ SUCCESS');
     } else {
         logs.push('❌ FAILED');
     }

     // Cleanup
     await supabaseAdmin.auth.admin.deleteUser(userId);
  };

  try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('email', 'cicicars.com@gmail.com').single();
      // Check the latest created profile
      const { data: profiles } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(3);
      logs.push(`Latest profiles: ${JSON.stringify(profiles)}`);
      return new Response(JSON.stringify({ logs }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
