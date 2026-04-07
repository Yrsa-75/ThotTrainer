import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceSupabase()

    // Récupérer les abonnements actifs depuis Stripe
    const subscriptions = await stripe.subscriptions.list({ status: 'all', limit: 100, expand: ['data.latest_invoice'] })

    // Récupérer les dernières factures payées
    const invoices = await stripe.invoices.list({ limit: 20, status: 'paid' })

    // Calculer MRR par plan
    const mrrByPlan: Record<string, number> = { starter: 0, business: 0, premium: 0 }
    const priceToName: Record<string, string> = {
      [process.env.STRIPE_PRICE_STARTER!]: 'starter',
      [process.env.STRIPE_PRICE_BUSINESS!]: 'business',
      [process.env.STRIPE_PRICE_PREMIUM!]: 'premium',
    }
    const countByPlan: Record<string, number> = { starter: 0, business: 0, premium: 0 }
    let totalMRR = 0

    for (const sub of subscriptions.data) {
      if (sub.status !== 'active' && sub.status !== 'trialing') continue
      const priceId = sub.items.data[0]?.price.id
      const planName = priceToName[priceId]
      if (!planName) continue
      const amount = (sub.items.data[0]?.price.unit_amount || 0) / 100
      if (sub.status === 'active') {
        mrrByPlan[planName] = (mrrByPlan[planName] || 0) + amount
        totalMRR += amount
      }
      countByPlan[planName] = (countByPlan[planName] || 0) + 1
    }

    // Clients en impayé
    const pastDue = subscriptions.data.filter(s => s.status === 'past_due').map(s => ({
      customer: s.customer,
      amount: (s.items.data[0]?.price.unit_amount || 0) / 100,
      since: new Date((s as any).current_period_end * 1000).toLocaleDateString('fr-FR'),
    }))

    // Factures récentes
    const recentInvoices = invoices.data.map(inv => ({
      id: inv.id,
      amount: (inv.amount_paid || 0) / 100,
      date: new Date((inv.created || 0) * 1000).toLocaleDateString('fr-FR'),
      customer_email: inv.customer_email || '',
      description: inv.lines.data[0]?.description || '',
      status: inv.status,
    }))

    // Orgs depuis Supabase
    const { data: orgs } = await supabase.from('organisations').select('id,name,plan,status,sessions_used,sessions_limit,created_at')

    const totalSessions = (orgs || []).reduce((a, o) => a + (o.sessions_used || 0), 0)
    const activeOrgs = (orgs || []).filter(o => o.status === 'active' || o.status === 'trialing').length
    const trialingOrgs = (orgs || []).filter(o => o.status === 'trialing').length
    const pastDueOrgs = (orgs || []).filter(o => o.status === 'past_due').length

    return NextResponse.json({
      mrr: { total: totalMRR, byPlan: mrrByPlan, countByPlan },
      orgs: { total: orgs?.length || 0, active: activeOrgs, trialing: trialingOrgs, pastDue: pastDueOrgs },
      sessions: { total: totalSessions },
      invoices: recentInvoices,
      pastDue,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
