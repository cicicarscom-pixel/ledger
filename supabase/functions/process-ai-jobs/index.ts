import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createMessageUseCase } from "../shared/container.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Atomik kilit ile işleri al (Maksimum 20 iş)
    const { data: jobs, error: claimError } = await supabase.rpc('claim_ai_jobs', { p_batch_size: 20 });

    if (claimError) {
      console.error("Error claiming AI jobs:", claimError);
      throw claimError;
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No pending AI jobs found." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Processing ${jobs.length} AI jobs...`);

    const useCase = createMessageUseCase(supabase);

    // 2. İşleri sırayla veya paralel işle
    // Rate limit yememek için for...of ile sırayla işlemek daha güvenlidir.
    for (const job of jobs) {
      console.log(`Executing job ID: ${job.id}, Type: ${job.task_type}`);
      
      try {
        if (job.task_type === 'instagram_comment' || job.task_type === 'social_message') {
          await useCase.execute(supabase, job.payload);
        } else {
          throw new Error(`Unknown task type: ${job.task_type}`);
        }

        // Başarılıysa kuyruktan tamamen sil (Veritabanının şişmemesi için)
        await supabase
          .from('ai_jobs')
          .delete()
          .eq('id', job.id);
          
      } catch (err: unknown) {
        console.error(`Job ID ${job.id} failed:`, err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        const newRetryCount = job.retry_count + 1;
        const status = newRetryCount >= job.max_retries ? 'failed' : 'pending';
        
        // Hata durumunda yeniden deneme için gecikme (Exponential backoff eklenebilir)
        const nextSchedule = new Date(Date.now() + newRetryCount * 5 * 60000).toISOString();

        await supabase
          .from('ai_jobs')
          .update({ 
            status: status, 
            retry_count: newRetryCount, 
            last_error: errorMessage,
            scheduled_at: status === 'pending' ? nextSchedule : job.scheduled_at
          })
          .eq('id', job.id);
      }
    }

    return new Response(JSON.stringify({ message: `Successfully processed ${jobs.length} AI jobs.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
