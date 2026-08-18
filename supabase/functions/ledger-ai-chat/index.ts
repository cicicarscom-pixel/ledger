import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0"
import { sendNotificationToUser, sendNotificationToAllUsers } from "./notificationTools.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, customInstruction, history } = await req.json()

    // 1. Authenticate user via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized: Invalid JWT')

    const apiKey = Deno.env.get('LEDGER_GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('LEDGER_GEMINI_API_KEY is not set in environment variables.')
    }

    // 2. Prepare System Instruction
    const systemInstruction = `Sen uzman bir Workigom Ledger (Mali Müşavir) Asistanısın.
Aşağıdaki SİSTEM TALİMATI, senin rolünü ve kurallarını belirler.

--- SİSTEM TALİMATI ---
${customInstruction || 'Kullanıcıya nazikçe ve profesyonelce yardımcı ol. JSON veya kod gösterme.'}
----------------------------------

ÖZEL ARAÇ (TOOL) KULLANIM TALİMATLARI:
Eğer kullanıcı "Bu mesajı [Kişi Adı]'na gönder" veya "Spesifik birine bildirim at" derse, sadece kişinin adını veya unvanını belirterek 'sendNotificationToUser' aracını kullan (ID bilmene gerek yok, araç isme göre bulur).
Eğer kullanıcı açıkça "Bunu tüm kullanıcılara gönder / herkese duyuru yap" derse, 'sendNotificationToAllUsers' aracını kullan. Araçları sadece kullanıcı özellikle talep ettiğinde kullan.

SADECE aşağıdaki JSON formatında yanıt dön:
{
  "text": "[Role bürünerek yazdığın doğal dildeki yanıt]"
}`;

    // 3. Prepare parts for Gemini API via direct REST Fetch
    console.log("Calling Gemini 1.5 Flash via REST API for Ledger AI Chat...");
    
    // Map history to contents
    const contents = (history || []).map((msg: any) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content || msg.text || "" }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: prompt || 'Merhaba' }]
    });

    const tools = [{
      function_declarations: [
        {
          name: "sendNotificationToUser",
          description: "Belirli bir kullanıcıya bildirim gönderir.",
          parameters: {
            type: "OBJECT",
            properties: {
              userNameOrId: { type: "STRING", description: "Kullanıcının adı, unvanı veya ID'si" },
              title: { type: "STRING", description: "Bildirim başlığı" },
              message: { type: "STRING", description: "Bildirim içeriği" }
            },
            required: ["userNameOrId", "title", "message"]
          }
        },
        {
          name: "sendNotificationToAllUsers",
          description: "Sistemdeki tüm kullanıcılara genel duyuru ve bildirim gönderir.",
          parameters: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Bildirim başlığı" },
              message: { type: "STRING", description: "Bildirim içeriği" }
            },
            required: ["title", "message"]
          }
        }
      ]
    }];

    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: contents,
      tools: tools
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(`Gemini API Error: ${JSON.stringify(data)}`);
    }

    let generatedText = "";
    
    // 4. Handle Function Calling Manually
    const candidate = data.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts) {
      const parts = candidate.content.parts;
      
      for (const part of parts) {
        if (part.functionCall) {
          const call = part.functionCall;
          console.log(`Executing tool: ${call.name}`, call.args);
          
          let toolResult = "";
          if (call.name === "sendNotificationToUser") {
            toolResult = await sendNotificationToUser(call.args.userNameOrId, call.args.title, call.args.message);
          } else if (call.name === "sendNotificationToAllUsers") {
            toolResult = await sendNotificationToAllUsers(call.args.title, call.args.message);
          }
          
          console.log(`Tool Result: ${toolResult}`);
          // Return the tool result as the response directly, since it fulfills the user's action
          generatedText = JSON.stringify({ text: `İşlem tamamlandı: ${toolResult}` });
          break; // Stop parsing other parts
        } else if (part.text) {
          generatedText += part.text;
        }
      }
    }
    
    let parsedResult = { text: "İçerik oluşturulamadı." }
    try {
       // If generatedText is already the JSON string from tool, it will parse fine.
       let cleanText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
       parsedResult = JSON.parse(cleanText);
    } catch(e) {
       console.error("Failed to parse Gemini JSON output:", generatedText);
       parsedResult.text = generatedText;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        text: parsedResult.text || ""
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Ledger AI Chat Error:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: `DEBUG HATA: ${error.message}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
