import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

let userNameOrId = "YILMAZ İNŞAAT TAAHHÜT VE TİCARET ANONİM ŞİRKETİ";

let safeSearch = userNameOrId
  .replace(/[ıIİi]/g, '%')
  .replace(/[ğĞ]/g, '%')
  .replace(/[üÜ]/g, '%')
  .replace(/[şŞ]/g, '%')
  .replace(/[öÖ]/g, '%')
  .replace(/[çÇ]/g, '%');

let searchWords = safeSearch.split(' ').filter(w => w.length > 2);
let smartSearchStr = searchWords.length > 0 ? searchWords.join('%') : safeSearch;

console.log("smartSearchStr:", smartSearchStr);

const { data: orgData, error: orgError } = await supabaseAdmin
  .from('organizations')
  .select('id, name')
  .ilike('name', `%${smartSearchStr}%`)
  .limit(1);

console.log("orgData:", orgData);
console.log("orgError:", orgError);
