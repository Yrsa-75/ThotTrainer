import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: "Tu es un coach commercial expert spécialisé Chronos Emploi. Réponds UNIQUEMENT en JSON valide.",
        messages: [{ role: "user", content: prompt }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || "{}"

    return NextResponse.json({ text })
  } catch (error) {
    console.error("Analyze API error:", error)
    return NextResponse.json({ text: '{"score":50,"summary":"Analyse non disponible","strengths":[],"improvements":[],"objections":[],"phase_coverage":{},"skills":{},"main_advice":"Réessayez."}' }, { status: 500 })
  }
}
