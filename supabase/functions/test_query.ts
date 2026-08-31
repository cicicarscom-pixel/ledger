
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const { count, error } = await supabase.from("appointment_services").select("*", { count: "exact", head: true });
console.log("Count:", count, "Error:", error);

