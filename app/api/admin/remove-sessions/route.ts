import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { orgId, sessions } = await req.json()
    if (!orgId || !sessions || sessions < 1) return NextResponse.json({ error: 'Params invalides' }, { status: 400 })

    const supabase = createServiceSupabase()

    const { data: org } = await supabase.from('organisations').select('sessions_limit, sessions_used').eq('id', orgId).single()
    if (!org) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

    // Safety: ne jamais descendre sous sessions_used (sinon le client aurait un quota negatif)
    const floor = org.sessions_used || 0
    const requested = (org.sessions_limit || 0) - sessions
    const newLimit = Math.max(floor, requested)
    const actualRemoved = (org.sessions_limit || 0) - newLimit

    await supabase.from('organisations').update({ sessions_limit: newLimit }).eq('id', orgId)

    return NextResponse.json({ success: true, new_limit: newLimit, actual_removed: actualRemoved, requested: sessions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
