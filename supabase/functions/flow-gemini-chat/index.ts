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

    const apiKey = Deno.env.get('LEDGER_GEMINI_API_KEY') || Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    const ai = new GoogleGenAI({ apiKey })

    const systemInstruction = "Sen yaratıcı bir sosyal medya metin yazarı ve uzmanısın."

    const inputParts: any[] = [
      { type: "text", text: systemInstruction },
      { type: "text", text: prompt || "Lütfen bu belgeyi analiz et." }
    ]

    if (image) {
      inputParts.push({
        type: "image",
        data: image,
        mime_type: mimeType || "image/jpeg"
      })
    }

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: inputParts
    })

    const generatedText = interaction.output_text || ""

    return new Response(
      JSON.stringify({ 
        success: true,
        text: generatedText
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Flow Gemini Chat Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
