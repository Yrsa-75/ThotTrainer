import { NextResponse } from 'next/server'
import { getApiKeys } from '@/lib/api-keys'

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    if (!text) return NextResponse.json({ fallback: true })

    const keys = await getApiKeys()
    if (!keys.openai) return NextResponse.json({ fallback: true })

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Authorization": `Bearer ${keys.openai}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", input: text, voice: "nova", response_format: "mp3", speed: 1.05 })
    })

    if (!response.ok || !response.body) return NextResponse.json({ fallback: true })

    // Stream audio directly
    return new Response(response.body, { headers: { 'Content-Type': 'audio/mpeg', 'Transfer-Encoding': 'chunked' } })
  } catch {
    return NextResponse.json({ fallback: true })
  }
}
