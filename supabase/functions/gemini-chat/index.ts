import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "npm:@google/genai"

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
    const bodyText = await req.text()
    if (!bodyText) throw new Error("Empty body")

    const bodyJson = JSON.parse(bodyText)
    const { prompt, image, mimeType } = bodyJson

    const apiKey = Deno.env.get('LEDGER_GEMINI_API_KEY')
    if (!apiKey) throw new Error('LEDGER_GEMINI_API_KEY is not set')

    const ai = new GoogleGenAI({ apiKey })

    const systemInstruction = `Lütfen faturadan veya işlem açıklamasından şu bilgileri çıkar ve sadece JSON formatında yanıt ver:
{
  "amount": (sayı olarak tutar, ondalık ayırıcı olarak nokta kullan. Sadece sayı.),
  "date": (YYYY-MM-DD formatında tarih, yoksa bugünün tarihi),
  "title": (Belge veya işlemin kısa başlığı/açıklaması),
  "type": (gelir ise "income", gider ise "expense")
}`

    const inputParts: any[] = [
      { type: "text", text: systemInstruction },
      { type: "text", text: prompt || "Lütfen bu belgeyi analiz et." }
    ]

    if (image) {
      inputParts.push({
        type: "image", // or media/document
        data: image,
        mime_type: mimeType || "image/jpeg"
      })
    }

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: inputParts
    })

    const generatedText = interaction.output_text || ""

    let parsedResult = {}
    try {
       const cleanText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
       parsedResult = JSON.parse(cleanText)
    } catch(e) {
       console.warn("Failed to parse output as JSON", generatedText)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        debug_parsedResult: parsedResult,
        debug_generatedText: generatedText
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Gemini Chat Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
