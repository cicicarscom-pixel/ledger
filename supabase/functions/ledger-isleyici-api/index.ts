import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { encode, decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

/** "07.09.2022" | "2022-09-07" -> "2022-09-07"; anlaşılmazsa null */
function toIsoDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const d = raw.trim();
  const m = d.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (DATE_RE.test(d)) return d;
  return null;
}

/** Kullanıcının sahibi ya da üyesi olduğu işletmeler */
async function orgIdsOf(supabase: any, userId: string): Promise<string[]> {
  const ids = new Set<string>();
  const { data: owned } = await supabase.from('organizations').select('id').eq('owner_id', userId);
  for (const o of owned ?? []) ids.add(o.id);
  const { data: member } = await supabase.from('organization_members').select('organization_id').eq('user_id', userId);
  for (const m of member ?? []) ids.add(m.organization_id);
  return [...ids];
}

/**
 * Kaydın yazılacağı işletme (organizations.id).
 * - customerId (muhasebeci akışı): çağıranla aktif bağlantısı olan mükellefin işletmesi
 * - requestedOrgId: çağıranın sahibi/üyesi olduğu işletme ise o
 * - yoksa çağıranın kendi işletmesi
 * Hiçbiri doğrulanamazsa null (kayıt yazılmaz).
 */
async function resolveTargetOrg(supabase: any, callerId: string, requestedOrgId?: string | null, customerId?: string | null): Promise<string | null> {
  if (customerId) {
    const { data: link } = await supabase
      .from('shared_accountant_taxpayer_links')
      .select('taxpayer_id')
      .eq('accountant_id', callerId)
      .eq('taxpayer_id', customerId)
      .eq('status', 'active')
      .limit(1);
    if (!link || link.length === 0) return null;
    const taxpayerOrgs = await orgIdsOf(supabase, customerId);
    return taxpayerOrgs[0] ?? null;
  }
  const mine = await orgIdsOf(supabase, callerId);
  if (requestedOrgId && mine.includes(requestedOrgId)) return requestedOrgId;
  return mine[0] ?? null;
}

async function orgTimezone(supabase: any, orgId: string | null): Promise<string> {
  if (!orgId) return 'Europe/Istanbul';
  const { data } = await supabase.from('organizations').select('timezone').eq('id', orgId).maybeSingle();
  return data?.timezone || 'Europe/Istanbul';
}

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

    // Kimlik: çağıran, Authorization başlığındaki oturumdan belirlenir (verify_jwt kapalı olduğu için burada).
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: authData } = jwt ? await supabaseClient.auth.getUser(jwt) : { data: null };
    const callerId: string | undefined = authData?.user?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (profile_id && profile_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden: profile_id does not match the session" }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      const profile_id = callerId;
      const contextOrgId = await resolveTargetOrg(supabaseClient, callerId, organization_id, null);
      const tz = await orgTimezone(supabaseClient, contextOrgId);
      const today = todayIn(tz);
      const todayLabel = new Intl.DateTimeFormat('tr-TR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

      // Fetch Memory Context
      let totals = { income: 0, expense: 0, receivable: 0, payable: 0 };
      let recentContext = "";
      // Talimat metninde try bloğunun DIŞINDA kullanılıyorlar; blok içinde tanımlanınca
      // her metin mesajı "chatHistoryContext is not defined" ile çöküyordu (28.09.2026).
      let customersListContext = "";
      let chatHistoryContext = "";

      try {
        // Fetch Customers (Müşteri Rehberi)
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
        const { data: trans } = contextOrgId
          ? await supabaseClient.from('transactions').select('*').eq('profile_id', contextOrgId).order('date', { ascending: false }).limit(30)
          : { data: [] };
        if (trans) {
          trans.forEach(t => {
            if (t.type === 'income') totals.income += Number(t.amount);
            if (t.type === 'expense') totals.expense += Number(t.amount);
          });
          recentContext += "Son islemler (transactions):\n" + trans.map(t => `${t.due_date || t.date}: ${t.title} - ${t.amount} TL (${t.type}) [${t.payment_status}]`).join('\n') + "\n\n";
        }

        // Documents
        if (contextOrgId) {
          const { data: docs } = await supabaseClient.from('finance_documents').select('*').eq('organization_id', contextOrgId).order('created_at', { ascending: false }).limit(30);
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

BUGUNUN TARIHI: ${today} (${todayLabel}). "yarin", "haftaya cuma", "ayin 15'i" gibi ifadeleri YALNIZCA bu tarihe gore YYYY-MM-DD'ye cevir.

GOREV:
Kullanici yeni bir manuel harcama, odeme veya gelir girdiyse (orn: "Yarin Ahmet'e 500 TL odemem var"), bunu algila ve JSON'daki 'manual_entry' objesini doldur.
- Gelecekte odenecek/tahsil edilecek bir sey ise: status = 'pending', due_date = o gun, date = o gun.
- Yapilmis/alinmis bir odeme ise: status = 'paid', date = odemenin yapildigi gun (belirtilmediyse bugun), due_date bos.
- Gecmis tarihli ama henuz odenmemis borc/alacak ise: status = 'pending', due_date = vade gunu.
- category: kira, fatura, maas, vergi, malzeme, hasta odemesi gibi kisa bir etiket (emin degilsen bos birak).
- Tutar veya tur (gelir/gider) belirsizse kayit OLUSTURMA; manual_entry null birak ve kullaniciya sor.
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
              status: { type: "string", description: "'pending' (odenecek/tahsil edilecek) veya 'paid' (odendi/tahsil edildi)" },
              due_date: { type: "string", description: "YYYY-MM-DD vade/son odeme gunu. Odenmis islemlerde bos." },
              category: { type: "string", description: "Kisa kategori etiketi (kira, fatura, maas, vergi, malzeme, hasta odemesi...). Emin degilsen bos." },
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

      let saved = false;
      let transactionId: string | null = null;
      let saveProblem: string | null = null;
      const me = extractedData.manual_entry;
      if (me) {
        const targetOrg = await resolveTargetOrg(supabaseClient, callerId, organization_id, me.customer_id || null);
        const entryDate = toIsoDate(me.date) ?? today;
        const status = me.status === 'pending' ? 'pending' : 'paid';
        const dueDate = toIsoDate(me.due_date) ?? (status === 'pending' ? entryDate : null);
        const amount = Number(me.amount);

        if (!targetOrg) {
          saveProblem = 'isletme_bulunamadi';
        } else if (me.type !== 'income' && me.type !== 'expense') {
          saveProblem = 'gecersiz_tur';
        } else if (!(amount > 0)) {
          saveProblem = 'gecersiz_tutar';
        } else {
          const { data: inserted, error: insertError } = await supabaseClient.from('transactions').insert({
            profile_id: targetOrg,                 // her zaman organizations.id
            title: String(me.title || '').trim() || (me.type === 'income' ? 'Gelir' : 'Gider'),
            amount,
            type: me.type,
            date: entryDate,
            due_date: dueDate,
            payment_status: status,
            category: me.category ? String(me.category).trim() : null,
            source: 'ai_chat',
          }).select('id').single();
          if (insertError) {
            console.error("Transaction insert error:", insertError);
            saveProblem = 'kayit_hatasi';
          } else {
            saved = true;
            transactionId = inserted?.id ?? null;
          }
        }
        if (!saved) {
          // AI'ın "kaydettim" demesine izin verme: kullanıcıya gerçeği söyle
          extractedData.message = `${extractedData.message}\n\n⚠️ Bu işlem takvime kaydedilemedi (${saveProblem}). Lütfen bilgileri kontrol edip tekrar deneyin.`;
        }
      }

      // Save to chat history
      try {
        await supabaseClient.from('ledger_chat_history').insert([
          { accountant_id: profile_id, role: 'user', content: prompt },
          { accountant_id: profile_id, role: 'model', content: extractedData.message }
        ]);
      } catch(e) { console.warn("Error saving chat history", e); }

      return new Response(JSON.stringify({
        success: true,
        message: extractedData.message,
        manual_entry: saved ? extractedData.manual_entry : null,
        saved,
        transaction_id: transactionId,
      }), {
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

    // Belge çağıranın (ya da bağlı mükellefinin) işletmesine ait olmalı
    {
      const { data: docOwner } = await supabaseClient.from('finance_documents').select('organization_id').eq('id', document_id).maybeSingle();
      if (!docOwner) {
        return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const mine = await orgIdsOf(supabaseClient, callerId);
      let allowed = mine.includes(docOwner.organization_id);
      if (!allowed) {
        const { data: orgRow } = await supabaseClient.from('organizations').select('owner_id').eq('id', docOwner.organization_id).maybeSingle();
        if (orgRow?.owner_id) {
          const { data: link } = await supabaseClient.from('shared_accountant_taxpayer_links')
            .select('taxpayer_id').eq('accountant_id', callerId).eq('taxpayer_id', orgRow.owner_id).eq('status', 'active').limit(1);
          allowed = !!(link && link.length > 0);
        }
      }
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
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
        due_date: { type: "string", description: "Son odeme tarihi / vade (GG.AA.YYYY). Faturada yazmiyorsa bos birak, UYDURMA." },
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

== VADE ==
- due_date: Faturada "Son Ödeme Tarihi", "Vade" veya "Ödeme Tarihi" yaziyorsa GG.AA.YYYY. Yoksa bos birak.

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

    // Vade: faturada varsa ve bugünden sonraysa ödenmemiş (takvimde "Bekliyor"); yoksa ödenmiş varsayılır
    const docTz = await orgTimezone(supabaseClient, (await supabaseClient.from('finance_documents').select('organization_id').eq('id', document_id).maybeSingle()).data?.organization_id ?? null);
    const docToday = todayIn(docTz);
    const dueIso = toIsoDate(extractedData.due_date);
    const paymentStatus = dueIso && dueIso > docToday ? 'unpaid' : 'paid';

    const updatePayload: any = {
      amount_minor: amountMinor,
      title: extractedData.title,
      type: isAlis ? 'expense' : 'income',   // tablo kısıtı yalnız income/expense kabul ediyor ('sales' her seferinde reddediliyordu)
      created_at: dateIso,
      due_date: dueIso,
      flow_payment_status: paymentStatus,
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
