import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'

const client = new Anthropic()

// Rate limit via Supabase Edge Function
async function checkRL(userId: string, orgId: string | null, endpoint: string): Promise<boolean> {
  try {
    const res = await fetch('https://nbxrxulszfopcmaocieb.supabase.co/functions/v1/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, orgId, endpoint })
    })
    const data = await res.json()
    return data.allowed !== false
  } catch { return true } // fail open
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('organisation_id').eq('id', user.id).single()
    const allowed = await checkRL(user.id, (profile as any)?.organisation_id || null, 'chat')
    if (!allowed) return NextResponse.json({ error: 'Trop de requetes, reessayez dans quelques secondes.' }, { status: 429 })

    const { system, messages } = await req.json()
    const response = await client.messages.create({ model: 'claude-opus-4-5', max_tokens: 1024, system, messages })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
