import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { system, messages } = await request.json()

    const apiMessages = messages.map((m: any) => ({
      role: m.sender === "vendor" ? "user" : "assistant",
      content: m.content
    }))

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system,
        messages: apiMessages
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || "..."

    return NextResponse.json({ text })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ text: "...(erreur serveur)" }, { status: 500 })
  }
}
