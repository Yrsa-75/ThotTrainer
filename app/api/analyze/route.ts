import { NextResponse } from 'next/server'
import { getApiKeys } from '@/lib/api-keys'
import { createServerSupabase } from '@/lib/supabase-server'

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

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('organisation_id').eq('id', user.id).single()
      const allowed = await checkRL(user.id, (profile as any)?.organisation_id || null, 'analyze')
      if (!allowed) return NextResponse.json({ error: 'Trop de requetes, reessayez dans quelques secondes.' }, { status: 429 })
    }

    const { prompt } = await request.json()
    const keys = await getApiKeys()
    if (!keys.anthropic) return NextResponse.json({ text: '{"score":50,"summary":"Cle API manquante"}' }, { status: 400 })

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": keys.anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: "Tu es un coach commercial expert. Reponds UNIQUEMENT en JSON valide.", messages: [{ role: "user", content: prompt }] })
    })
    const data = await response.json()
    return NextResponse.json({ text: data.content?.[0]?.text || '{}' })
  } catch (error: any) {
    return NextResponse.json({ text: '{"score":50,"summary":"Analyse non disponible"}' }, { status: 200 })
  }
}
