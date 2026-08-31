
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { AppointmentRepository } from "./shared/infrastructure/repositories/AppointmentRepository.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const repo = new AppointmentRepository(supabase);
const testOrgId = "00000000-0000-0000-0000-000000000000"; // I need a valid org id, let me just get the first one.

async function test() {
  const { data: users } = await supabase.auth.admin.listUsers();
  if (!users || users.users.length === 0) { console.log("No users found"); return; }
  const orgId = users.users[0].id;
  const testPhone = "+905551234567";
  const testName = "Test Müşteri";
  
  await repo.upsertCustomer(orgId, testPhone, testName);
  
  const { data, error } = await supabase.from("customers").select("*").eq("organization_id", orgId).eq("phone", testPhone);
  console.log("SQL Result:", JSON.stringify(data, null, 2), error || "");
}

test();

