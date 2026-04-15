import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const admin = createServiceClient()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const admin = createServiceClient()

    const { data: profile } = await admin.from('profiles')
      .select('role, organisation_id').eq('id', user.id).single()
    if (!profile?.organisation_id) return NextResponse.json({ error: 'Org non trouvée' }, { status: 400 })
    if (profile.role !== 'admin' && profile.role !== 'super_admin')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

    const orgId = profile.organisation_id

    const { data: vendors } = await admin.from('profiles')
      .select('id, full_name, email, sessions_allocated')
      .eq('organisation_id', orgId).eq('role', 'vendor')

    const { data: sessionCounts } = await admin.from('sessions')
      .select('vendor_id').eq('organisation_id', orgId).eq('counted', true)

    const usedByVendor: Record<string, number> = {}
    sessionCounts?.forEach(s => {
      usedByVendor[s.vendor_id] = (usedByVendor[s.vendor_id] || 0) + 1
    })

    const { count: adminUsed } = await admin.from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', user.id).eq('counted', true)

    const { data: org } = await admin.from('organisations')
      .select('sessions_limit, sessions_used').eq('id', orgId).single()

    const totalAllocated = vendors?.reduce((s, v) => s + (v.sessions_allocated || 0), 0) || 0

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
        admin_pool: Math.max(0, (org?.sessions_limit || 0) - totalAllocated),
        admin_used: adminUsed || 0,
        admin_remaining: Math.max(0, (org?.sessions_limit || 0) - totalAllocated - (adminUsed || 0))
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const admin = createServiceClient()
    const { data: profile } = await admin.from('profiles')
      .select('role, organisation_id').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

    const { vendorId, sessions_allocated } = await request.json()
    if (typeof sessions_allocated !== 'number' || sessions_allocated < 0)
      return NextResponse.json({ error: 'Valeur invalide' }, { status: 400 })

    const { data: vendor } = await admin.from('profiles')
      .select('organisation_id, role').eq('id', vendorId).single()
    if (!vendor || vendor.organisation_id !== profile.organisation_id || vendor.role !== 'vendor')
      return NextResponse.json({ error: 'Vendeur non trouvé' }, { status: 404 })

    const { data: org } = await admin.from('organisations')
      .select('sessions_limit').eq('id', profile.organisation_id).single()
    const { data: allVendors } = await admin.from('profiles')
      .select('id, sessions_allocated').eq('organisation_id', profile.organisation_id).eq('role', 'vendor')

    const totalOthers = allVendors?.filter(v => v.id !== vendorId)
      .reduce((s, v) => s + (v.sessions_allocated || 0), 0) || 0

    if (totalOthers + sessions_allocated > (org?.sessions_limit || 0)) {
      return NextResponse.json({
        error: `Total alloué (${totalOthers + sessions_allocated}) > limite (${org?.sessions_limit})`
      }, { status: 400 })
    }

    await admin.from('profiles').update({ sessions_allocated }).eq('id', vendorId)
    return NextResponse.json({ success: true, sessions_allocated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
