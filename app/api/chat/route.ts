import { NextResponse } from 'next/server'
import { getApiKeys } from '@/lib/api-keys'

export async function POST(request: Request) {
  try {
    const { system, messages } = await request.json()
    const keys = await getApiKeys()
    if (!keys.anthropic) return NextResponse.json({ text: "Aucune clé API Anthropic configurée." }, { status: 400 })

    const apiMessages = messages.map((m: any) => ({ role: m.sender === "vendor" ? "user" : "assistant", content: m.content }))
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": keys.anthropic,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: apiMessages
      })
    })
    const data = await response.json()
    return NextResponse.json({ text: data.content?.[0]?.text || "..." })
  } catch (error) {
    return NextResponse.json({ text: "...(erreur serveur)" }, { status: 500 })
  }
}
