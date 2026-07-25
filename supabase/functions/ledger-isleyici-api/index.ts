import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { encode, decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { document_id, prompt, imageBase64, imageUrl, mimeType, profile_id, organization_id } = await req.json();

    if (!prompt && !imageBase64 && !imageUrl) {
      return new Response(JSON.stringify({ error: "Missing input." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LEDGER_GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error("LEDGER_GEMINI_API_KEY is not set.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const ai = new GoogleGenAI({ apiKey });

    let activeBase64 = imageBase64;
    if (!activeBase64 && imageUrl) {
      console.log("Fetching image from Storage URL...");
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        activeBase64 = encode(new Uint8Array(arrayBuffer));
      }
    }

    // ========================================================================
    // TEXT-ONLY MODE: FINANCIAL AUDITOR & MANUAL ENTRY
    // ========================================================================
    if (!activeBase64) {
      if (!profile_id) throw new Error("profile_id is required for text mode.");

      // Fetch Memory Context
      let totals = { income: 0, expense: 0, receivable: 0, payable: 0 };
      let recentContext = "";

      try {
        // Fetch Customers (Müşteri Rehberi)
        let customersListContext = "";
        try {
          const { data: links } = await supabaseClient
            .from('shared_accountant_taxpayer_links')
            .select('taxpayer_id')
            .eq('accountant_id', profile_id)
            .eq('status', 'active');
            
          if (links && links.length > 0) {
            const taxpayerIds = links.map(l => l.taxpayer_id);
            const { data: profiles } = await supabaseClient
              .from('profiles')
              .select('id, business_name, phone_number')
              .in('id', taxpayerIds);
              
            if (profiles && profiles.length > 0) {
              customersListContext = "MÜŞTERİ REHBERİ (Sana Bağlı Mükellefler):\n" + 
                profiles.map(p => `- İsim: ${p.business_name || 'İsimsiz'}, Telefon: ${p.phone_number || 'Yok'}, Müşteri ID: ${p.id}`).join('\n') + 
                "\n\n";
            }
          }
        } catch(e) { console.warn("Error fetching customer context", e); }

        // Fetch Chat History
        let chatHistoryContext = "";
        try {
          const { data: history } = await supabaseClient
            .from('ledger_chat_history')
            .select('*')
            .eq('accountant_id', profile_id)
            .order('created_at', { ascending: false })
            .limit(20);

          if (history && history.length > 0) {
            // Reverse to get chronological order for the prompt
            const chronologicalHistory = history.reverse();
            chatHistoryContext = "SOHBET GEÇMİŞİ (Son 20 Mesaj):\n" + 
              chronologicalHistory.map(h => `${h.role === 'user' ? 'Kullanıcı' : 'AI'}: ${h.content}`).join('\n\n') + 
              "\n\n";
          }
        } catch(e) { console.warn("Error fetching chat history", e); }

        // Transactions
        const { data: trans } = await supabaseClient.from('transactions').select('*').eq('profile_id', profile_id).order('date', { ascending: false }).limit(30);
        if (trans) {
          trans.forEach(t => {
            if (t.type === 'income') totals.income += Number(t.amount);
            if (t.type === 'expense') totals.expense += Number(t.amount);
          });
          recentContext += "Son islemler (transactions):\n" + trans.map(t => `${t.date}: ${t.title} - ${t.amount} TL (${t.type})`).join('\n') + "\n\n";
        }

        // Documents
        if (organization_id) {
          const { data: docs } = await supabaseClient.from('finance_documents').select('*').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(30);
          if (docs) {
            docs.forEach(d => {
              const amount = Number(d.amount_minor) / 100;
              if (d.flow_payment_status === 'paid') {
                if (d.type === 'income' || d.type === 'sales') totals.income += amount;
                if (d.type === 'expense') totals.expense += amount;
              } else {
                if (d.type === 'income' || d.type === 'sales') totals.receivable += amount;
                if (d.type === 'expense') totals.payable += amount;
              }
            });
            recentContext += "Son faturalar (finance_documents):\n" + docs.map(d => `${new Date(d.created_at).toISOString().split('T')[0]}: ${d.title} - ${Number(d.amount_minor)/100} TL (${d.type}) [Odeme: ${d.flow_payment_status}]`).join('\n') + "\n\n";
          }
        }
      } catch (e) {
        console.warn("Error fetching memory context", e);
      }

      const systemInstruction = `Sen mukellefin finansal denetcisi ve kisisel muhasebecisisin (AI Muhasebe Asistani).
Sana mukellefin sordugu sorulara VEYA girdigi manuel gelir/gider islemine yanit vereceksin.

${chatHistoryContext}MUKELLEFIN ANLIK DURUMU (Özet):
- Toplam Odenmis Gelir: ${totals.income} TL
- Toplam Odenmis Gider: ${totals.expense} TL
- Toplam Bekleyen Alacak: ${totals.receivable} TL
- Toplam Bekleyen Borc: ${totals.payable} TL

${customersListContext}MUKELLEFIN SON ISLEMLERI:
${recentContext}

GOREV:
Kullanici yeni bir manuel harcama, odeme veya gelir girdiyse (orn: "Yarin Ahmet'e 500 TL odemem var"), bunu algila ve JSON'daki 'manual_entry' objesini doldur.
Eger sadece bir soru soruyorsa veya islem yoksa 'manual_entry' kismini null birak.
Kullaniciya samimi, guven veren, profesyonel bir metinle (markdown destekli) yanit ver. Yaniti 'message' alanina yaz. Geçmiş sohbete atıfta bulunursa onu anladığını belli et.

SADECE JSON FORMATINDA YANIT VER. Baska hicbir sey yazma.`;

      const responseSchema = {
        type: "object",
        properties: {
          message: { type: "string", description: "Kullaniciya gosterilecek yanit metni." },
          manual_entry: {
            type: "object",
            nullable: true,
            description: "Eger kullanici yeni bir kasa islemi (gelir/gider) bildirdiyse doldurulacak.",
            properties: {
              title: { type: "string", description: "Islem basligi (orn: Ahmet'e odeme)" },
              amount: { type: "number", description: "Tutar (orn: 500)" },
              type: { type: "string", description: "'income' veya 'expense'" },
              date: { type: "string", description: "YYYY-MM-DD formatinda islem tarihi." },
              status: { type: "string", description: "Gelecek tarihliyse 'pending', bugun/gecmisse 'paid'" },
              customer_id: { type: "string", description: "Müşteri Rehberi'nden eşleşen kişinin Müşteri ID'si. Eşleşme yoksa boş bırakılabilir." }
            },
            required: ["title", "amount", "type", "date", "status"]
          }
        },
        required: ["message"]
      };

      const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash",
        system_instruction: systemInstruction,
        input: [{ type: "text", text: prompt }],
        response_format: [{ type: "text", mime_type: "application/json", schema: responseSchema }]
      });

      let text = interaction.output_text || "{}";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const extractedData = JSON.parse(text);

      if (extractedData.manual_entry) {
        // Insert into transactions
        const { error: insertError } = await supabaseClient.from('transactions').insert({
          profile_id: extractedData.manual_entry.customer_id || profile_id,
          title: extractedData.manual_entry.title,
          amount: extractedData.manual_entry.amount,
          type: extractedData.manual_entry.type,
          date: extractedData.manual_entry.date,
          status: extractedData.manual_entry.status
        });
        if (insertError) console.error("Transaction insert error:", insertError);
      }

      // Save to chat history
      try {
        await supabaseClient.from('ledger_chat_history').insert([
          { accountant_id: profile_id, role: 'user', content: prompt },
          { accountant_id: profile_id, role: 'model', content: extractedData.message }
        ]);
      } catch(e) { console.warn("Error saving chat history", e); }

      return new Response(JSON.stringify({ success: true, message: extractedData.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // ========================================================================
    // IMAGE/PDF MODE: OFFICIAL INVOICE PARSING
    // ========================================================================
    if (!document_id) {
       return new Response(JSON.stringify({ error: "Missing document_id for image processing." }), { status: 400, headers: corsHeaders });
    }

    let taxpayerName = "Bilinmiyor";
    try {
      const { data: docData } = await supabaseClient.from('finance_documents').select(`organizations:organization_id (name)`).eq('id', document_id).single();
      if (docData && docData.organizations && docData.organizations.name) {
        taxpayerName = docData.organizations.name;
      }
    } catch (e) {
      console.warn("Could not fetch taxpayer name", e);
    }

    const responseSchema = {
      type: "object",
      properties: {
        date: { type: "string", description: "A sutunu: GG.AA.YYYY formatinda fatura tarihi (orn: 07.09.2022)" },
        invoice_number: { type: "string", description: "B sutunu: Fatura belgesi uzerindeki numara (orn: AAA2022000000135)" },
        type: { type: "string", description: "C sutunu: 'ALIS' veya 'SATIS'. DIKKAT: Satici firmasi mukellefimiz ise SATIS, alici firmasi mukellefimiz ise ALIS" },
        vendor_tax_id: { type: "string", description: "D sutunu: KARSI TARAFIN VKN (10 hane) veya TCKN (11 hane). Karsi taraf = mukellefimiz olmayan taraf" },
        title: { type: "string", description: "E sutunu: KARSI TARAFIN (mukellefimiz olmayan firma) ticari unvani" },
        taxes: {
          type: "array",
          description: "Faturadaki KDV oranlari ve tutarlari listesi. Faturada hangi KDV oranlari varsa onlari ekle.",
          items: {
            type: "object",
            properties: {
              rate: { type: "number", description: "KDV Orani (Orn: 1, 8, 10, 18, 20)" },
              matrah: { type: "number", description: "Bu KDV orani icin vergisiz NET tutar (Matrah, BUYUK rakam)" },
              kdv_amount: { type: "number", description: "Bu KDV orani icin hesaplanan KDV TUTARI (Vergi miktari, KUCUK rakam)" }
            },
            required: ["rate", "matrah", "kdv_amount"]
          }
        },
        tevkifat_orani: { type: "string", description: "F sutunu: Tevkifat orani (orn: 2/10). Yoksa bos birak" },
        ozel_matrah: { type: "number", description: "G sutunu: Ozel matraha tabi tutar. Yoksa bos birak" },
        total: { type: "number", description: "R sutunu: Faturanin ODENCEK GENEL TOPLAMI (Matrah + KDV). Bu ornekte = 944" }
      },
      required: ["date", "invoice_number", "type", "vendor_tax_id", "title", "total", "taxes"]
    };

    const systemInstruction = `Sen Turk vergi mevzuatinda uzman bir muhasebe asistanisın.
Gorev: Fatura gorselini analiz edip asagidaki JSON alanlarini doldur.

== FATURA TURU BELIRLEME (C sutunu) ==
- Faturanin EN UST KISMINDA (satici bolumu) MUKELLEFIMIZIN UNVANI varsa => type = "SATIS"
- Faturanin EN UST KISMINDA BASKA BIR FIRMA varsa ve MUKELLEFIMIZ ortada/altta ALICI olarak geciyorsa => type = "ALIS"
- Mukellefimizin unvani: "${taxpayerName}"

== KDV ANALIZI (en kritik kisim) ==
Faturanin alt kismindaki TOPLAM TABLOSUNU veya KDV ORANLARINI bul ve KDV oranlarina gore 'taxes' dizisini (array) olustur:
- "rate": KDV Orani (1, 8, 10, 18, 20)
- "matrah": Vergisiz net tutari (BUYUK rakam).
- "kdv_amount": Sadece Vergi miktarini (KUCUK rakam).
KURAL: kdv_amount her zaman matrah'tan kucuktur!

== KARSI TARAF BILGILERI ==
- vendor_tax_id (D sutunu): Mukellefimiz OLMAYAN tarafin VKN/TCKN'si
- title (E sutunu): Karsi tarafin (mukellefimiz olmayan) ticari unvani

== TARIH ==
- date: GG.AA.YYYY formatinda (orn: 07.09.2022)

== FATURA NUMARASI ==
- invoice_number: Fatura No / Belge No (orn: AAA2022000000135)

Sadece JSON formatında yanıt ver. Baska hicbir sey yazma.`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      system_instruction: systemInstruction,
      input: [
        { type: "text", text: prompt || "Lütfen bu belgeyi analiz et ve bilgileri çıkar." },
        {
          type: "image",
          mime_type: mimeType || "image/jpeg",
          data: activeBase64.replace(/^data:image\/\w+;base64,/, '')
        }
      ],
      response_format: [{ type: "text", mime_type: "application/json", schema: responseSchema }]
    });

    let text = interaction.output_text || "";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const extractedData = JSON.parse(text);
    
    if (extractedData.taxes && Array.isArray(extractedData.taxes)) {
      extractedData.taxes.forEach((tax: any) => {
        if (tax.rate) {
          extractedData[`kdv_${tax.rate}`] = tax.kdv_amount;
          extractedData[`matrah_${tax.rate}`] = tax.matrah;
        }
      });
      delete extractedData.taxes;
    }

    if (extractedData.tevkifat_orani && extractedData.tevkifat_orani.includes('matrah')) {
      extractedData.tevkifat_orani = null;
    }

    let uploadedImageUrl = null;
    try {
      const ext = mimeType === 'application/pdf' ? 'pdf' : 'jpg';
      const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
      const uint8Array = decode(activeBase64.replace(/^data:image\/\w+;base64,/, '')); 
      
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage.from('finance_receipts').upload(fileName, uint8Array, { contentType: mimeType || 'image/jpeg', upsert: true });

      if (!uploadError && uploadData) {
         uploadedImageUrl = supabaseClient.storage.from('finance_receipts').getPublicUrl(fileName).data.publicUrl;
      }
    } catch (e) {
      console.warn("Exception during storage upload in edge function", e);
    }

    const amountMinor = Math.round((extractedData.total || 0) * 100);
    
    let dateIso = new Date().toISOString();
    if (extractedData.date) {
      try {
        const d = extractedData.date.trim();
        if (d.includes('.')) {
          const parts = d.split('.');
          if (parts.length === 3) dateIso = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`).toISOString();
        } else if (d.includes('-')) {
          dateIso = new Date(d).toISOString();
        }
      } catch(e) {}
    }

    const typeLabel = extractedData.type || 'expense';
    const isAlis = typeLabel === 'ALIS' || typeLabel === 'expense';

    const updatePayload: any = {
      amount_minor: amountMinor,
      title: extractedData.title,
      type: isAlis ? 'expense' : 'sales',
      created_at: dateIso,
      flow_payment_status: 'paid',
      ledger_official_status: 'taslak',
      tax_details: extractedData
    };

    if (uploadedImageUrl) updatePayload.image_url = uploadedImageUrl;

    const { data: updatedDoc, error: updateError } = await supabaseClient
      .from('finance_documents').update(updatePayload).eq('id', document_id).select().single();

    if (updateError) throw updateError;

    try {
      await supabaseClient.from('document_events').insert({
        document_id: document_id, event_type: 'ai_extraction', new_value: extractedData
      });
    } catch(logErr) {}

    const successMessage = `Harika! ${extractedData.title || 'Bilinmeyen'} firmasına ait, ${extractedData.date || 'bugün'} tarihli ve ${extractedData.total || 0} TL tutarındaki belgeniz başarıyla işlendi ve onay için taslaklara gönderildi.`;

    return new Response(JSON.stringify({ success: true, document: updatedDoc, message: successMessage }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Isleyici API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "An error occurred." }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
