import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { orgId, days } = await req.json()
    if (!orgId || !days || days < 1) return NextResponse.json({ error: 'Params invalides' }, { status: 400 })
    
    const supabase = createServiceSupabase()
    
    // Get current org
    const { data: org } = await supabase.from('organisations').select('trial_ends_at, status').eq('id', orgId).single()
    if (!org) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
    
    // Extend from today or from current trial end, whichever is later
    const base = org.trial_ends_at && new Date(org.trial_ends_at) > new Date() ? new Date(org.trial_ends_at) : new Date()
    const newEnd = new Date(base.getTime() + days * 86400000).toISOString()
    
    await supabase.from('organisations').update({
      trial_ends_at: newEnd,
      status: 'trialing',
      current_period_end: newEnd,
    }).eq('id', orgId)
    
    return NextResponse.json({ success: true, newEnd })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
