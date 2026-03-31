import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    if (!text) return NextResponse.json({ error: "No text" }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ fallback: true }, { status: 200 })
    }

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

    if (!response.ok) {
      return NextResponse.json({ fallback: true }, { status: 200 })
    }

    const audioBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(audioBuffer).toString('base64')
    
    return NextResponse.json({ audio: base64 })
  } catch (error) {
    return NextResponse.json({ fallback: true }, { status: 200 })
  }
}
