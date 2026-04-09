import { NextResponse } from 'next/server'
import { getApiKeys } from '@/lib/api-keys'

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()
    const keys = await getApiKeys()
    if (!keys.anthropic) return NextResponse.json({ text: '{"score":50,"summary":"Clé API manquante"}' }, { status: 400 })

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": keys.anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: "Tu es un coach commercial expert. Réponds UNIQUEMENT en JSON valide.", messages: [{ role: "user", content: prompt }] })
    })
    const data = await response.json()
    return NextResponse.json({ text: data.content?.[0]?.text || '{}' })
  } catch (error) {
    return NextResponse.json({ text: '{"score":50,"summary":"Analyse non disponible"}' }, { status: 500 })
  }
}
