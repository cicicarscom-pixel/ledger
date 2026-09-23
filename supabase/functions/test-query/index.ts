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
      const migrationSql = `
-- 1. Create calendars table
CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  working_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calendars are viewable by everyone"
  ON public.calendars FOR SELECT
  USING (true);

CREATE POLICY "Merchants can insert their own calendars"
  ON public.calendars FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can update their own calendars"
  ON public.calendars FOR UPDATE
  TO authenticated
  USING (merchant_id = auth.uid());

CREATE POLICY "Merchants can delete their own calendars"
  ON public.calendars FOR DELETE
  TO authenticated
  USING (merchant_id = auth.uid());


-- 2. Create calendar_services table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.calendar_services (
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.business_services(id) ON DELETE CASCADE,
  PRIMARY KEY (calendar_id, service_id)
);

ALTER TABLE public.calendar_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calendar services are viewable by everyone"
  ON public.calendar_services FOR SELECT
  USING (true);

CREATE POLICY "Merchants can manage their calendar services"
  ON public.calendar_services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars
      WHERE calendars.id = calendar_services.calendar_id
      AND calendars.merchant_id = auth.uid()
    )
  );

-- 3. Add toggle to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS multi_calendar_enabled BOOLEAN NOT NULL DEFAULT false;

-- 4. Add calendar_id to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS calendar_id UUID REFERENCES public.calendars(id) ON DELETE SET NULL;

-- 5. Add exclusion constraint for non-overlapping appointments on the same calendar
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS no_overlapping_appointments;

ALTER TABLE public.appointments
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (
    calendar_id WITH =,
    tstzrange(
      (date::timestamptz),
      (date::timestamptz) + interval '30 minutes'
    ) WITH &&
  )
  WHERE (calendar_id IS NOT NULL AND status IN ('Pending','Approved'));
      `;

      // We need to use postgres query. But we don't have direct access here.
      // Supabase edge functions can't execute raw DDL via supabase-js without an RPC.
      // Oh, wait, supabase-js `rpc` can execute arbitrary sql if we made one.
      `;
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
