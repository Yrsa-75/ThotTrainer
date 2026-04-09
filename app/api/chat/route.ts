import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { system, messages } = await req.json()
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system,
      messages,
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
