import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function createServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function createSSRClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  )
}

// GET — récupérer les allocations vendeurs de l'org
export async function GET() {
  try {
    const supabase = createSSRClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role, organisation_id').eq('id', user.id).single()
    if (!profile?.organisation_id) return NextResponse.json({ error: 'Org non trouvée' }, { status: 400 })
    if (profile.role !== 'admin' && profile.role !== 'super_admin') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

    const admin = createServiceSupabase()

    // Profils vendeurs avec leurs sessions utilisées
    const { data: vendors } = await admin
      .from('profiles')
      .select('id, full_name, email, sessions_allocated')
      .eq('organisation_id', profile.organisation_id)
      .eq('role', 'vendor')

    // Sessions comptées par vendeur
    const { data: sessionCounts } = await admin
      .from('sessions')
      .select('vendor_id')
      .eq('organisation_id', profile.organisation_id)
      .eq('counted', true)

    const usedByVendor: Record<string, number> = {}
    sessionCounts?.forEach(s => {
      usedByVendor[s.vendor_id] = (usedByVendor[s.vendor_id] || 0) + 1
    })

    // Sessions admin utilisées
    const { count: adminUsed } = await admin
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', user.id)
      .eq('counted', true)

    // Org info
    const { data: org } = await admin
      .from('organisations')
      .select('sessions_limit, sessions_used')
      .eq('id', profile.organisation_id)
      .single()

    const totalAllocated = vendors?.reduce((sum, v) => sum + (v.sessions_allocated || 0), 0) || 0
    const adminPool = Math.max(0, (org?.sessions_limit || 0) - totalAllocated)
    const adminRemaining = Math.max(0, adminPool - (adminUsed || 0))

    return NextResponse.json({
      vendors: vendors?.map(v => ({
        ...v,
        sessions_used: usedByVendor[v.id] || 0,
        sessions_remaining: Math.max(0, (v.sessions_allocated || 0) - (usedByVendor[v.id] || 0))
      })) || [],
      org: {
        sessions_limit: org?.sessions_limit || 0,
        sessions_used: org?.sessions_used || 0,
        total_allocated: totalAllocated,
        admin_pool: adminPool,
        admin_used: adminUsed || 0,
        admin_remaining: adminRemaining
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — mettre à jour l'allocation d'un vendeur
export async function POST(request: Request) {
  try {
    const supabase = createSSRClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role, organisation_id').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

    const { vendorId, sessions_allocated } = await request.json()
    if (typeof sessions_allocated !== 'number' || sessions_allocated < 0) {
      return NextResponse.json({ error: 'Valeur invalide' }, { status: 400 })
    }

    const admin = createServiceSupabase()

    // Vérifier que le vendeur appartient bien à l'org
    const { data: vendor } = await admin.from('profiles').select('organisation_id, role').eq('id', vendorId).single()
    if (!vendor || vendor.organisation_id !== profile.organisation_id || vendor.role !== 'vendor') {
      return NextResponse.json({ error: 'Vendeur non trouvé dans votre organisation' }, { status: 404 })
    }

    // Vérifier que le total alloué ne dépasse pas sessions_limit
    const { data: org } = await admin.from('organisations').select('sessions_limit').eq('id', profile.organisation_id).single()
    const { data: allVendors } = await admin.from('profiles').select('id, sessions_allocated').eq('organisation_id', profile.organisation_id).eq('role', 'vendor')

    const totalOtherVendors = allVendors?.filter(v => v.id !== vendorId).reduce((sum, v) => sum + (v.sessions_allocated || 0), 0) || 0
    const newTotal = totalOtherVendors + sessions_allocated

    if (newTotal > (org?.sessions_limit || 0)) {
      return NextResponse.json({
        error: `Impossible : ${sessions_allocated} crédits pour ce vendeur + ${totalOtherVendors} déjà alloués = ${newTotal} > limite de ${org?.sessions_limit} sessions`
      }, { status: 400 })
    }

    await admin.from('profiles').update({ sessions_allocated }).eq('id', vendorId)
    return NextResponse.json({ success: true, sessions_allocated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
