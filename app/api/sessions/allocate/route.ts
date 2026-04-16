import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function anonClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = anonClient(request)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const admin = serviceClient()
    const { data: profile } = await admin.from('profiles')
      .select('role, organisation_id').eq('id', user.id).single()

    if (!profile?.organisation_id)
      return NextResponse.json({ error: 'Org non trouvée' }, { status: 400 })
    if (profile.role !== 'admin' && profile.role !== 'super_admin')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

    const orgId = profile.organisation_id

    const { data: vendors } = await admin.from('profiles')
      .select('id, full_name, email, sessions_allocated')
      .eq('organisation_id', orgId).eq('role', 'vendor')

    const { data: sessionCounts } = await admin.from('sessions')
      .select('vendor_id').eq('organisation_id', orgId).eq('counted', true)

    const usedByVendor: Record<string, number> = {}
    sessionCounts?.forEach((s: any) => {
      usedByVendor[s.vendor_id] = (usedByVendor[s.vendor_id] || 0) + 1
    })

    const { data: org } = await admin.from('organisations')
      .select('sessions_limit, sessions_used').eq('id', orgId).single()

    const totalAllocated = vendors?.reduce((s: number, v: any) => s + (v.sessions_allocated || 0), 0) || 0
    const orgRemaining = Math.max(0, (org?.sessions_limit || 0) - (org?.sessions_used || 0))

    return NextResponse.json({
      vendors: vendors?.map((v: any) => {
        const used = usedByVendor[v.id] || 0
        const allocated = v.sessions_allocated || 0
        return {
          ...v,
          sessions_used: used,
          sessions_remaining: Math.max(0, allocated - used)
        }
      }) || [],
      org: {
        sessions_limit: org?.sessions_limit || 0,
        sessions_used: org?.sessions_used || 0,
        sessions_remaining: orgRemaining,
        total_allocated: totalAllocated,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = anonClient(request)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const admin = serviceClient()
    const { data: profile } = await admin.from('profiles')
      .select('role, organisation_id').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

    const { vendorId, sessions_allocated } = await request.json()
    if (typeof sessions_allocated !== 'number' || sessions_allocated < 0)
      return NextResponse.json({ error: 'Valeur invalide' }, { status: 400 })

    const { data: vendor } = await admin.from('profiles')
      .select('organisation_id, role, sessions_allocated').eq('id', vendorId).single()
    if (!vendor || vendor.organisation_id !== profile.organisation_id || vendor.role !== 'vendor')
      return NextResponse.json({ error: 'Vendeur non trouvé' }, { status: 404 })

    // Récupérer l'org et tous les vendeurs
    const { data: org } = await admin.from('organisations')
      .select('sessions_limit, sessions_used').eq('id', profile.organisation_id).single()
    const { data: allVendors } = await admin.from('profiles')
      .select('id, sessions_allocated')
      .eq('organisation_id', profile.organisation_id).eq('role', 'vendor')

    // Récupérer les sessions utilisées par chaque vendeur
    const { data: sessionCounts } = await admin.from('sessions')
      .select('vendor_id')
      .eq('organisation_id', profile.organisation_id).eq('counted', true)

    const usedByVendor: Record<string, number> = {}
    sessionCounts?.forEach((s: any) => {
      usedByVendor[s.vendor_id] = (usedByVendor[s.vendor_id] || 0) + 1
    })

    // Calcul : total des sessions "restantes promises" à tous les vendeurs après modification
    const orgRemaining = (org?.sessions_limit || 0) - (org?.sessions_used || 0)
    
    let totalVendorRemaining = 0
    allVendors?.forEach((v: any) => {
      const alloc = v.id === vendorId ? sessions_allocated : (v.sessions_allocated || 0)
      const used = usedByVendor[v.id] || 0
      totalVendorRemaining += Math.max(0, alloc - used)
    })

    if (totalVendorRemaining > orgRemaining) {
      return NextResponse.json({
        error: `Impossible : les vendeurs auraient ${totalVendorRemaining} sessions restantes mais l'organisation n'en a que ${orgRemaining} disponibles. Réduisez les allocations.`
      }, { status: 400 })
    }

    // L'allocation ne peut pas être inférieure aux sessions déjà utilisées par le vendeur
    const vendorUsed = usedByVendor[vendorId] || 0
    if (sessions_allocated < vendorUsed) {
      return NextResponse.json({
        error: `Ce vendeur a déjà utilisé ${vendorUsed} sessions. L'allocation ne peut pas être inférieure.`
      }, { status: 400 })
    }

    await admin.from('profiles').update({ sessions_allocated }).eq('id', vendorId)
    return NextResponse.json({ success: true, sessions_allocated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
