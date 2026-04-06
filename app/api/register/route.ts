import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { orgName, adminEmail, adminName, password } = await req.json()
    if (!orgName || !adminEmail || !adminName || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }
    const supabase = createServiceSupabase()
    const slug = orgName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { data: existing } = await supabase.from('organisations').select('id').eq('slug', slug).single()
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug
    const { data: org, error: orgError } = await supabase.from('organisations').insert({
      name: orgName, slug: finalSlug, plan: 'trial', sessions_limit: 0, status: 'trialing',
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()
    if (orgError) throw new Error(orgError.message)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail, password, email_confirm: true, user_metadata: { full_name: adminName },
    })
    if (authError) {
      await supabase.from('organisations').delete().eq('id', org.id)
      throw new Error(authError.message)
    }
    await supabase.from('profiles').insert({ id: authUser.user.id, email: adminEmail, full_name: adminName, role: 'admin', organisation_id: org.id })
    return NextResponse.json({ orgId: org.id, userId: authUser.user.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
