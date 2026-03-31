export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    if (!text) return new Response(JSON.stringify({ fallback: true }), { headers: { 'Content-Type': 'application/json' } })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return new Response(JSON.stringify({ fallback: true }), { headers: { 'Content-Type': 'application/json' } })

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "nova",
        response_format: "mp3",
        speed: 1.05
      })
    })

    if (!response.ok || !response.body) {
      return new Response(JSON.stringify({ fallback: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Stream l'audio directement depuis OpenAI vers le navigateur
    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked'
      }
    })
  } catch {
    return new Response(JSON.stringify({ fallback: true }), { headers: { 'Content-Type': 'application/json' } })
  }
}
