import { NextResponse } from 'next/server'
import { getApiKeys } from '@/lib/api-keys'

// GET — le navigateur pointe directement ici, commence à jouer dès les premiers octets
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const text = url.searchParams.get('t')
    if (!text) return new Response('Missing text', { status: 400 })

    const keys = await getApiKeys()
    if (!keys.openai) return new Response('No key', { status: 400 })

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Authorization": `Bearer ${keys.openai}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", input: text, voice: "nova", response_format: "mp3", speed: 1.05 })
    })

    if (!response.ok || !response.body) return new Response('TTS failed', { status: 500 })

    return new Response(response.body, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' }
    })
  } catch {
    return new Response('Error', { status: 500 })
  }
}

// POST — vérifie si la clé est configurée (utilisé pour le fallback check)
export async function POST(request: Request) {
  try {
    const keys = await getApiKeys()
    if (!keys.openai) return NextResponse.json({ fallback: true })
    return NextResponse.json({ available: true })
  } catch {
    return NextResponse.json({ fallback: true })
  }
}
