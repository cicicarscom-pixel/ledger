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
    const { prompt, image, mimeType, mode, aspectRatio } = bodyJson

    const apiKey = Deno.env.get('LEDGER_GEMINI_API_KEY') || Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('API KEY is not set')

    const ai = new GoogleGenAI({ apiKey })

    let systemInstruction = `Lütfen faturadan veya işlem açıklamasından şu bilgileri çıkar ve sadece JSON formatında yanıt ver:
{
  "amount": (sayı olarak tutar, ondalık ayırıcı olarak nokta kullan. Sadece sayı.),
  "date": (YYYY-MM-DD formatında tarih, yoksa bugünün tarihi),
  "title": (Belge veya işlemin kısa başlığı/açıklaması),
  "type": (gelir ise "income", gider ise "expense")
}`

    if (mode === 'social') {
      systemInstruction = "Sen profesyonel bir sosyal medya uzmanısın. İstenilen içerik için yaratıcı, dikkat çekici, emojili ve hashtagli bir sosyal medya gönderisi hazırla. Markdown kullanma, sadece düz metin döndür."
    }

    const parts: any[] = [
      { text: systemInstruction },
      { text: prompt || (mode === 'social' ? "Harika bir sosyal medya gönderisi hazırla." : "Lütfen bu belgeyi analiz et.") }
    ]

    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType || "image/jpeg"
        }
      })
    }

    // 1. Text Generation
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: parts
    })
    const generatedText = response.text || ""

    // 2. Image Generation (if social mode & image provided)
    let generatedImageBase64 = null;
    if (mode === 'social' && image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
      const imageMimeType = mimeType || 'image/jpeg'
      let enhancedPrompt = `Act as an elite luxury editorial product photographer and world-class art director. Seamlessly integrate the attached product into the following concept: [${prompt}]. CRITICAL AESTHETIC RULES: 1. Use intense controlled studio lighting. 2. The environment must feature minimalist, high-end textured backgrounds. 3. Apply a luxury editorial style, optimized for Instagram. 4. DO NOT add any hallucinated text or typography.`;
      
      if (aspectRatio && aspectRatio !== 'Orijinal') {
        enhancedPrompt += `\n\nÖNEMLİ: Çıktı görselinin en-boy oranı kesinlikle ${aspectRatio} olmalıdır. Resmi bu boyuta uyacak şekilde yeniden boyutlandırın, genişletin veya kırpın.`;
      }

      const imgPayload: any = {
        contents: [{
          parts: [
            { text: enhancedPrompt },
            { inlineData: { mimeType: imageMimeType, data: base64Data } }
          ]
        }],
        generationConfig: { responseModalities: ["IMAGE"] }
      }

      try {
        const imgResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(imgPayload) }
        );
        if (imgResponse.ok) {
          const imgResult = await imgResponse.json();
          generatedImageBase64 = imgResult.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        } else {
          console.error("Image gen failed:", await imgResponse.text());
        }
      } catch (err) {
        console.error("Image generation error:", err);
      }
    }

    let parsedResult = {}
    if (mode !== 'social') {
      try {
         const cleanText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
         parsedResult = JSON.parse(cleanText)
      } catch(e) {
         console.warn("Failed to parse output as JSON", generatedText)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        text: generatedText,
        generatedImage: generatedImageBase64,
        debug_parsedResult: parsedResult
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
