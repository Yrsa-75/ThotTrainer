import { NextResponse } from 'next/server'
import { getApiKeys } from '@/lib/api-keys'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const text = url.searchParams.get('t')
    const voice = url.searchParams.get('v') || 'nova'
    if (!text) return new Response('Missing text', { status: 400 })

    const keys = await getApiKeys()
    if (!keys.openai) return new Response('No key', { status: 400 })

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Authorization": `Bearer ${keys.openai}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", input: text, voice: voice, response_format: "mp3", speed: 1.05 })
    })

    if (!response.ok || !response.body) return new Response('TTS failed', { status: 500 })

    return new Response(response.body, {
      headers: { 'Content-Type': 'audio/mpeg', 'Transfer-Encoding': 'chunked', 'Cache-Control': 'no-cache' }
    })
  } catch (error: any) {
    return new Response('Error: ' + error.message, { status: 500 })
  }
}
