import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()
const RL_URL = 'https://nbxrxulszfopcmaocieb.supabase.co/functions/v1/rate-limit'

function getSubFromJWT(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const parts = authHeader.slice(7).split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
    return payload.sub || null
  } catch { return null }
}

async function checkRL(userId: string | null, endpoint: string): Promise<boolean> {
  if (!userId) return true
  try {
    const res = await fetch(RL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, endpoint })
    })
    const data = await res.json()
    return data.allowed !== false
  } catch { return true }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getSubFromJWT(req.headers.get('authorization'))
    const allowed = await checkRL(userId, 'chat')
    if (!allowed) return NextResponse.json({ error: 'Trop de requetes, reessayez dans quelques secondes.' }, { status: 429 })

    const { system, messages } = await req.json()
    const response = await client.messages.create({ model: 'claude-opus-4-5', max_tokens: 1024, system, messages })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
