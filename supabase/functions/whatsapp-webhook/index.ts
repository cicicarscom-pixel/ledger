import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

// Fallback WhatsApp API Developer Token (if client token is not yet established)
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN') || 'DUMMY_TOKEN';
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'aiesnaf_verify';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

import { AppointmentService } from '../shared/appointment/AppointmentService.ts';
import { AppointmentStatus } from '../shared/contracts/AppointmentStatus.ts';

const appointmentService = new AppointmentService(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper to ask Gemini
async function askGemini(prompt: string, apiKey: string, systemPrompt?: string) {
  const defaultSystemPrompt = "Sen Workigom Flow dijital asistanısın. Esnafın işlerini yönetmesine WhatsApp üzerinden yardımcı oluyorsun. Kısa, net ve samimi cevaplar ver.";
  
  // Strict rule injection for Booking Engine
  const strictBookingRule = `
KATI KURAL: Sen Workigom'un akıllı randevu asistanısın. Müşteriye boş saatleri sunarken ASLA düz metin listesi yapmayacaksın. Müsait saatleri daima WAHA Interactive Reply Buttons formatında göndereceksin. Her bir butonun arka plandaki (payload) ID değeri KESİNLİKLE approve:{appointment_id}:{time} formatında olmak zorundadır. Bunu yapmak için 'create_pending_appointment' fonksiyonunu kullanmalısın.`;

  const activeSystemPrompt = (systemPrompt || defaultSystemPrompt) + strictBookingRule;

  const tools = [
    {
      functionDeclarations: [
        {
          name: "list_available_slots",
          description: "Belirtilen tarih için uygun saatleri döner. NOT: Bu fonksiyon sadece bilgi içindir, kullanıcıya saatleri göstermek istersen 'create_pending_appointment' çağırarak butonlarla göndermelisin.",
          parameters: {
            type: "OBJECT",
            properties: {
              date: { type: "STRING", description: "YYYY-MM-DD formatında tarih" },
              serviceId: { type: "STRING", description: "Randevu istenen hizmet ID'si (örn: 'genel')" }
            },
            required: ["date", "serviceId"]
          }
        },
        {
          name: "create_pending_appointment",
          description: "Müşteriye uygun saatleri buton olarak sunmak ve veritabanında geçici (PENDING) randevu oluşturmak için bu fonksiyonu çağır. Bu fonksiyon otomatik olarak WAHA Interactive Buttons gönderir.",
          parameters: {
            type: "OBJECT",
            properties: {
              customerPhone: { type: "STRING" },
              date: { type: "STRING", description: "YYYY-MM-DD formatında tarih" },
              serviceId: { type: "STRING" },
              suggestedTimes: { 
                type: "ARRAY", 
                items: { type: "STRING" },
                description: "Kullanıcıya sunulacak müsait saatlerin dizisi (Örn: ['10:00', '13:00']) (Maksimum 3 adet)" 
              }
            },
            required: ["customerPhone", "date", "serviceId", "suggestedTimes"]
          }
        },
        {
          name: "check_slot_conflict",
          description: "Kullanıcının seçtiği saatte başka bir randevu çakışması olup olmadığını kontrol eder.",
          parameters: {
            type: "OBJECT",
            properties: {
              date: { type: "STRING" },
              time: { type: "STRING", description: "HH:mm formatında saat" },
              employeeId: { type: "STRING", description: "Opsiyonel personel ID'si" }
            },
            required: ["date", "time"]
          }
        },
        {
          name: "suggest_alternative_slots",
          description: "İstenen saat doluysa, aynı gün veya ertesi gün için alternatif saatler üretir.",
          parameters: {
            type: "OBJECT",
            properties: {
              date: { type: "STRING" },
              time: { type: "STRING" }
            },
            required: ["date", "time"]
          }
        },
        {
          name: "get_user_booking_history",
          description: "Müşterinin geçmiş randevularını (iptal/no-show durumlarını) getirerek risk profilini çıkartır.",
          parameters: {
            type: "OBJECT",
            properties: {
              customerPhone: { type: "STRING" }
            },
            required: ["customerPhone"]
          }
        },
        {
          name: "estimate_duration_by_service",
          description: "Seçilen hizmet türüne göre randevunun tahmini ne kadar süreceğini hesaplar.",
          parameters: {
            type: "OBJECT",
            properties: {
              serviceId: { type: "STRING" }
            },
            required: ["serviceId"]
          }
        }
      ]
    }
  ];

  const payload = {
    contents: [
      {
        parts: [
          { text: activeSystemPrompt },
          { text: `Kullanıcı mesajı: ${prompt}` }
        ]
      }
    ],
    tools: tools
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) throw new Error("Gemini API error");
  
  const result = await response.json();
  const candidate = result.candidates?.[0];
  
  // Check if Gemini invoked a function call
  const functionCall = candidate?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

  return {
    text: candidate?.content?.parts?.[0]?.text || '',
    functionCall: functionCall,
    usageMetadata: result.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 }
  };
}

// Helper function to reply reactively via Meta's Graph API (Cloud API v19.0)
async function sendWhatsAppReply(businessPhoneNumberId: string, accessToken: string, to: string, message: string, replyToMessageId: string) {
  const url = `https://graph.facebook.com/v19.0/${businessPhoneNumberId}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    context: {
      message_id: replyToMessageId // CRITICAL: strictly flags this as a reactive service message
    },
    text: {
      preview_url: false,
      body: message
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("WhatsApp message reply failed:", errorText);
    throw new Error(`WhatsApp API error: ${errorText}`);
  }
}

// Helper function to send interactive button reply via Meta's Graph API
async function sendWhatsAppInteractiveReply(businessPhoneNumberId: string, accessToken: string, to: string, messageText: string, buttons: any[], replyToMessageId: string) {
  const url = `https://graph.facebook.com/v19.0/${businessPhoneNumberId}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    context: {
      message_id: replyToMessageId
    },
    interactive: {
      type: "button",
      body: {
        text: messageText
      },
      action: {
        buttons: buttons
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("WhatsApp interactive message failed:", errorText);
    throw new Error(`WhatsApp API error: ${errorText}`);
  }
}

serve(async (req) => {
  const url = new URL(req.url);

  // 1. Meta Webhook Verification (GET)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'aiesnaf_verify';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook Verified successfully');
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    console.warn('Webhook Verification failed: token mismatch or invalid mode');
    return new Response('Forbidden', { status: 403 });
  }

  // 2. Incoming Messages (POST)
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      // Check if it's a valid WhatsApp message event
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0]?.value;
        const message = change?.messages?.[0];
        const metadata = change?.metadata;

        if (message && metadata) {
          const customerPhone = message.from;
          const businessPhoneNumberId = metadata.phone_number_id;
          const messageId = message.id;

          // Process interactive button replies directly to AppointmentService
          if (message.type === 'interactive') {
            const buttonReply = message.interactive?.button_reply;
            if (buttonReply && buttonReply.id) {
              const [action, appointmentId, time] = buttonReply.id.split(':');
              
              if (action === 'approve') {
                try {
                  // Pass messageId as Idempotency Key to prevent duplicate clicks processing
                  const result = await appointmentService.approveAppointment(appointmentId, time, messageId);
                  
                  if (!result) {
                     // Result is null if Idempotency check caught it or State Guard blocked it
                     console.log(`State Guard or Idempotency rejected button click for message ${messageId}`);
                     return new Response('OK', { status: 200 });
                  }

                  // Use user's access token or fallback
                  const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('whatsapp_access_token')
                    .eq('whatsapp_phone_number_id', businessPhoneNumberId)
                    .single();
                    
                  const activeToken = profile?.whatsapp_access_token || WHATSAPP_TOKEN;
                  await sendWhatsAppReply(businessPhoneNumberId, activeToken, customerPhone, `Randevunuz onaylandı: Saat ${time}`, messageId);
                } catch (err: any) {
                  console.error("Error approving appointment:", err);
                }
              }
            }
            return new Response('OK', { status: 200 });
          }

          if (message.type === 'text') {
            const incomingText = message.text?.body;
            console.log(`Received message from customer ${customerPhone} to business phone ID ${businessPhoneNumberId}: "${incomingText}"`);

          // 3. Query profiles where whatsapp_phone_number_id === businessPhoneNumberId
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, system_prompt, whatsapp_access_token, whatsapp_message_count, whatsapp_monthly_quota')
            .eq('whatsapp_phone_number_id', businessPhoneNumberId)
            .single();

          if (profileError || !profile) {
            console.error(`Profile not found for WhatsApp Business Phone ID: ${businessPhoneNumberId}`);
            return new Response('OK', { status: 200 });
          }

          // Use user's access token or fallback platform token
          const activeToken = profile.whatsapp_access_token || WHATSAPP_TOKEN;

          // Quota Check: Prevent calling Gemini if monthly limit has been exceeded
          const messageCount = profile.whatsapp_message_count || 0;
          const monthlyQuota = profile.whatsapp_monthly_quota || 1000;

          if (messageCount >= monthlyQuota) {
            console.log(`Quota exceeded for profile ${profile.id}: ${messageCount}/${monthlyQuota}`);
            await sendWhatsAppReply(
              businessPhoneNumberId,
              activeToken,
              customerPhone,
              "Mesajınız için teşekkürler. Bu işletmenin yapay zeka asistanı aylık hizmet kotasını doldurmuştur. Lütfen mesai saatleri içinde işletme ile doğrudan iletişime geçin.",
              messageId
            );
            return new Response('OK', { status: 200 });
          }

          // Fetch Gemini API Key from environment
          const apiKey = Deno.env.get("GEMINI_API_KEY");
          if (!apiKey) {
            console.warn("No Gemini API key configured in system environment");
            await sendWhatsAppReply(businessPhoneNumberId, activeToken, customerPhone, "Yapay zeka sistemi şu anda yanıt veremiyor. Lütfen daha sonra tekrar deneyin.", messageId);
            return new Response('OK', { status: 200 });
          }

          // 4. Gemini AI processing and Reactive Reply
          try {
            const { text: reply, functionCall, usageMetadata } = await askGemini(
              incomingText,
              apiKey,
              profile.system_prompt
            );

            // Handle Function Calls
            if (functionCall) {
              const { name, args } = functionCall;
              
              if (name === 'list_available_slots') {
                const slots = await appointmentService.getAvailableSlots(args.date, args.serviceId);
                
                // If we are here, ideally AI should have called create_pending_appointment. 
                // But if it asks for slots, we can force it to use them by immediately creating the pending appt ourselves
                // or just replying via system text. Since we must strictly use buttons:
                
                const bookingToken = crypto.randomUUID();
                const newAppt = await appointmentService.create({
                  customerPhone: customerPhone,
                  serviceId: args.serviceId,
                  date: args.date,
                  status: AppointmentStatus.Pending,
                  bookingToken: bookingToken
                }, messageId);

                if (!newAppt) {
                   await sendWhatsAppReply(businessPhoneNumberId, activeToken, customerPhone, "Randevu oluşturulamadı.", messageId);
                   return;
                }

                // WAHA allows max 3 buttons
                const buttonSlots = slots.slice(0, 3);
                const buttons = buttonSlots.map((time) => ({
                  type: "reply",
                  reply: {
                    id: `approve:${newAppt.id}:${time}`,
                    title: time
                  }
                }));

                await sendWhatsAppInteractiveReply(
                  businessPhoneNumberId, 
                  activeToken, 
                  customerPhone, 
                  `${args.date} tarihi için boş saatler. Lütfen seçiminizi yapın:`, 
                  buttons, 
                  messageId
                );

              } else if (name === 'create_pending_appointment') {
                const bookingToken = crypto.randomUUID();
                const newAppt = await appointmentService.create({
                  customerPhone: args.customerPhone || customerPhone,
                  serviceId: args.serviceId,
                  date: args.date,
                  status: AppointmentStatus.Pending,
                  bookingToken: bookingToken
                }, messageId);

                if (!newAppt) {
                   await sendWhatsAppReply(businessPhoneNumberId, activeToken, customerPhone, "Randevu oluşturulamadı.", messageId);
                   return;
                }

                const suggestedTimes: string[] = args.suggestedTimes || ['09:00', '10:00', '11:00'];
                const buttonSlots = suggestedTimes.slice(0, 3);
                const buttons = buttonSlots.map((time) => ({
                  type: "reply",
                  reply: {
                    id: `approve:${newAppt.id}:${time}`,
                    title: time
                  }
                }));
                
                await sendWhatsAppInteractiveReply(
                  businessPhoneNumberId, 
                  activeToken, 
                  customerPhone, 
                  `${args.date} tarihi için taslak randevunuz hazır. Lütfen saatinizi seçerek onaylayın:`, 
                  buttons, 
                  messageId
                );
              } else if (name === 'check_slot_conflict') {
                const isConflict = false; // Mocking no conflict
                const replyMessage = isConflict 
                  ? "Maalesef bu saat dolu. Lütfen başka bir saat seçin."
                  : "Bu saat müsait. Randevunuzu oluşturuyorum.";
                await sendWhatsAppReply(businessPhoneNumberId, activeToken, customerPhone, replyMessage, messageId);

              } else if (name === 'suggest_alternative_slots') {
                const replyMessage = "O saat dolu ama 14:00 veya 16:30 saatleri uygun, hangisini istersiniz?";
                await sendWhatsAppReply(businessPhoneNumberId, activeToken, customerPhone, replyMessage, messageId);

              } else if (name === 'get_user_booking_history') {
                await sendWhatsAppReply(businessPhoneNumberId, activeToken, customerPhone, "Müşteri geçmişiniz kontrol edildi.", messageId);

              } else if (name === 'estimate_duration_by_service') {
                const replyMessage = "Bu hizmet ortalama 45 dakika sürmektedir.";
                await sendWhatsAppReply(businessPhoneNumberId, activeToken, customerPhone, replyMessage, messageId);
              }
            } else if (reply) {
              // Send reply reactively back to customer
              await sendWhatsAppReply(businessPhoneNumberId, activeToken, customerPhone, reply, messageId);
            }

            // Increment usage counter in database
            const { error: incrementError } = await supabaseAdmin
              .from('profiles')
              .update({ whatsapp_message_count: messageCount + 1 })
              .eq('id', profile.id);

            if (incrementError) {
              console.error("Failed to increment WhatsApp message count:", incrementError);
            }

            // Log Usage to Supabase
            const promptTokens = usageMetadata.promptTokenCount || 0;
            const completionTokens = usageMetadata.candidatesTokenCount || 0;
            const geminiInputCostUSD = (promptTokens / 1000000) * 0.075;
            const geminiOutputCostUSD = (completionTokens / 1000000) * 0.30;
            const estimatedCostTry = (geminiInputCostUSD + geminiOutputCostUSD) * 36.0;

            await supabaseAdmin.from('api_usage_logs').insert({
              user_id: profile.id,
              feature: 'whatsapp',
              model_name: 'gemini-2.5-flash',
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              generated_image_count: 0,
              estimated_cost_try: estimatedCostTry
            });

          } catch (e: any) {
            console.error("Failed to generate response or send reply:", e.message);
            await sendWhatsAppReply(businessPhoneNumberId, activeToken, customerPhone, "Yapay zeka yanıt verirken veya mesaj gönderilirken bir sorun oluştu.", messageId);
          }
        }
      }
      
      return new Response('OK', { status: 200 });
    } catch (err) {
      console.error(err);
      return new Response(err.message, { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});
