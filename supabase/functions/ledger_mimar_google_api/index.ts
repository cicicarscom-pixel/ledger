import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { invoiceBase64, invoiceMimeType, uiScreenshotBase64, uiScreenshotMimeType } = await req.json();

    if (!invoiceBase64 || !uiScreenshotBase64) {
      return new Response(JSON.stringify({ error: "Missing required fields: invoiceBase64 and uiScreenshotBase64." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LEDGER_GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error("LEDGER_GEMINI_API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Yardımcı fonksiyon: URL'yi base64'e çevirir (veya zaten base64 ise sadece header'ı temizler)
    async function getBase64Data(input: string): Promise<string> {
      if (input.startsWith('http')) {
        const response = await fetch(input);
        if (!response.ok) throw new Error(`Failed to fetch image from URL: ${input}`);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      }
      return input.replace(/^data:image\/\w+;base64,/, '');
    }

    const invoiceData = await getBase64Data(invoiceBase64);
    const uiScreenshotData = await getBase64Data(uiScreenshotBase64);

    const systemInstruction = `Sen Workigom Ledger AI projesinin 'Mimar (Şema Kurucu) Asistanı'sın. Sana aynı anda iki adet görsel gönderilmektedir:
1. Görsel: Kaynak Fatura.
2. Görsel: Bu faturanın işleneceği Muhasebe Programı/Excel arayüzü.

Görevin:
1) İkinci görseldeki (muhasebe arayüzü) veri giriş alanlarını, sütunları ve kolon başlıklarını EKSİKSİZ tespit et ve listele.
2) ÇOK ÖNEMLİ KURAL: Muhasebe ekranındaki tüm kolonları listeye eklemeli ve eşleştirmelisin. 1. Görseldeki fatura örneğinde o kolona ait bir veri (örneğin %1 KDV) OLMASA BİLE, o kolonu tespit etmeli ve gelecekte o veriyi içeren bir fatura geldiğinde nereye yazılacağını belirtecek şekilde eşleştirmelisin (Örn: 'Faturada varsa %1 KDV Tutarı' -> '%1 KDV'). Şema, arayüzdeki tüm olası veri giriş alanlarını kapsamalıdır.
3) İlk görseldeki (fatura) bilgileri analiz et ve hangi fatura bilgisinin, tespit ettiğin hangi kolona/alana girilmesi gerektiğini genel kurallar halinde eşleştir.
4) İşleyici (Analizci) AI asistanının daha sonra faturaları bu kurguya göre okuyabilmesi için net bir 'Kolon Çekim Kuralları' yönergesi oluştur.

DİKKAT: Gönderilen faturadaki verileri (isim, tutar, tarih vb.) KESİNLİKLE OKUMAYA VEYA ÇIKARTMAYA ÇALIŞMA. Görevin fatura okumak değil, SADECE iki görseli kıyaslayıp mantıksal KOLON EŞLEŞTİRMESİ YAPMAKTIR (Mimar promptunu kullan). Asla hayali veri üretme.`;

    const responseSchema = {
      type: "object",
      properties: {
        detected_columns: {
          type: "array",
          items: { type: "string" },
          description: "Ekranda tespit edilen tüm kolonların listesi"
        },
        mapping_rules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source_field: { type: "string" },
              target_column: { type: "string" }
            }
          },
          description: "Hangi kolon -> Faturadaki hangi bilgi. Örneğin: 'Belge No' kolonu -> Faturadaki Fatura Numarası"
        },
        analyzer_instructions: {
          type: "string",
          description: "İşleyici AI için üretilmiş, 'Şu kolonlar için şu verileri bul' diyen kısa yönerge metni."
        }
      },
      required: ["detected_columns", "mapping_rules", "analyzer_instructions"]
    };

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      system_instruction: systemInstruction,
      input: [
        { type: "text", text: "Ekteki iki görseli analiz et ve eşleştirme şemasını çıkar." },
        {
          type: "image",
          mime_type: invoiceMimeType || "image/jpeg",
          data: invoiceData
        },
        {
          type: "image",
          mime_type: uiScreenshotMimeType || "image/jpeg",
          data: uiScreenshotData
        }
      ],
      response_format: [
        {
          type: "text",
          mime_type: "application/json",
          schema: responseSchema
        }
      ]
    });

    let text = interaction.output_text || "";
    if (!text) {
      throw new Error("Empty response from Gemini.");
    }

    const parsedResult = JSON.parse(text);

    return new Response(JSON.stringify(parsedResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Mimar API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "An error occurred during schema generation." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
