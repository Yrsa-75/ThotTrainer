import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 })
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    const { data: session } = await supabase.from('sessions').select('id, counted, organisation_id').eq('id', sessionId).eq('vendor_id', user.id).single()
    if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    if (session.counted) return NextResponse.json({ already: true })
    await supabase.rpc('count_session', { session_id: sessionId })
    return NextResponse.json({ counted: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
