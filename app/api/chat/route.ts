import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'
import { checkRateLimit } from '@/lib/rate-limit'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Rate limit
    const { data: profile } = await supabase.from('profiles').select('organisation_id').eq('id', user.id).single()
    const rl = await checkRateLimit(user.id, profile?.organisation_id || null, 'chat')
    if (!rl.allowed) return NextResponse.json({ error: rl.message }, { status: 429 })

    const { system, messages, voice } = await req.json()

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
