import { NextResponse } from 'next/server'
import { createServiceSupabase, createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    // Vérifier que c'est un admin et récupérer son org
    const { data: profile } = await supabase.from('profiles').select('role, organisation_id').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') return NextResponse.json({ error: 'Non autorise' }, { status: 403 })

    const { email, password, full_name } = await request.json()
    const admin = createServiceSupabase()

    // Créer l'utilisateur auth
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name }
    })
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

    // Créer le profil avec organisation_id de l'admin
    const { error: profileError } = await admin.from('profiles').insert({
      id: newUser.user.id,
      email,
      full_name,
      role: 'vendor',
      organisation_id: profile.organisation_id
    })
    if (profileError) {
      await admin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: newUser.user.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') return NextResponse.json({ error: 'Non autorise' }, { status: 403 })

    const { userId } = await request.json()
    const admin = createServiceSupabase()

    await admin.from('profiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
