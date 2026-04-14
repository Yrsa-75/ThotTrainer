import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { orgId, sessions } = await req.json()
    if (!orgId || !sessions || sessions < 1) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const { data: org } = await supabaseAdmin.from('organisations').select('sessions_limit').eq('id', orgId).single()
    if (!org) return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })

    const { error } = await supabaseAdmin.from('organisations').update({
      sessions_limit: (org.sessions_limit || 0) + sessions
    }).eq('id', orgId)

    if (error) throw error
    return NextResponse.json({ success: true, new_limit: (org.sessions_limit || 0) + sessions })
  } catch (e: any) {
    console.error('add-sessions error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
