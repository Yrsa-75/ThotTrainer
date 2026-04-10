import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  try {
    // Verify authenticated user
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value } } } as any
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Get user profile to verify org
    const { data: profile } = await supabase.from('profiles').select('role, organisation_id').eq('id', user.id).single()
    if (!profile || !profile.organisation_id) return NextResponse.json({ error: 'Profil ou organisation introuvable' }, { status: 403 })
    if (!['admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

    const orgId = profile.organisation_id
    const { config, personas, products, scoring } = await request.json()

    // Service role client (bypasses RLS)
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const results = { config: false, personas: 0, products: 0, scoring: false }

    // 1. Save config to platform_config
    if (config) {
      const { data: existing } = await admin.from('platform_config').select('id').eq('organisation_id', orgId).single()
      if (existing) {
        await admin.from('platform_config').update(config).eq('id', existing.id)
      } else {
        await admin.from('platform_config').insert({ ...config, organisation_id: orgId })
      }
      results.config = true
    }

    // 2. Insert personas
    if (personas?.length) {
      for (const p of personas) {
        const { error } = await admin.from('personas').insert({
          organisation_id: orgId,
          is_active: true,
          name: p.name || 'Persona',
          subtitle: p.subtitle || '',
          age: p.age || 40,
          emoji: p.emoji || '\u{1F464}',
          profession: p.profession || '',
          situation: p.situation || '',
          personality: p.personality || '',
          motivations: p.motivations || '',
          obstacles: p.obstacles || '',
          communication_style: p.communication_style || ''
        })
        if (!error) results.personas++
      }
    }

    // 3. Insert products/formations
    if (products?.length) {
      for (const f of products) {
        const { error } = await admin.from('formations').insert({
          organisation_id: orgId,
          is_active: true,
          name: f.name || 'Produit',
          description: f.description || '',
          price: f.price || '',
          key_arguments: f.key_arguments || [],
          common_objections: f.common_objections || []
        })
        if (!error) results.products++
      }
    }

    // 4. Insert scoring rules
    if (scoring) {
      // Deactivate existing scoring for this org
      await admin.from('scoring_rules').update({ is_active: false }).eq('organisation_id', orgId).eq('is_active', true)
      const { error } = await admin.from('scoring_rules').insert({
        organisation_id: orgId,
        is_active: true,
        positive_criteria: scoring.positive || [],
        negative_criteria: scoring.negative || [],
        success_threshold: scoring.success_threshold || 80,
        level1_start_score: scoring.level1_start_score || 20,
        level2_start_score: scoring.level2_start_score || 5,
        level3_start_score: scoring.level3_start_score || -15
      })
      if (!error) results.scoring = true
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
