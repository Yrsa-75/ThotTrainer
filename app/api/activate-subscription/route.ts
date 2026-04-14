import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })

const PLAN_PRICES: Record<string, string> = {
  starter: 'price_1TME57RpbK02np6XkykAfZxj',
  business: 'price_1TMDyGRpbK02np6XrvLNU9lZ',
  premium: 'price_1TMDyORpbK02np6X9XPIDQee',
}

export async function POST(req: NextRequest) {
  try {
    const { orgId, adminEmail } = await req.json()
    if (!orgId) return NextResponse.json({ error: 'orgId requis' }, { status: 400 })

    const supabase = createServiceSupabase()

    const { data: org } = await supabase.from('organisations').select('*').eq('id', orgId).single()
    if (!org) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

    const priceId = PLAN_PRICES[org.plan]
    if (!priceId) return NextResponse.json({ error: 'Forfait invalide' }, { status: 400 })

    if (org.stripe_subscription_id) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: org.stripe_customer_id,
        return_url: process.env.NEXT_PUBLIC_APP_URL || 'https://app.thot.team',
      })
      return NextResponse.json({ url: portalSession.url })
    }

    let customerId = org.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: adminEmail || org.name,
        name: org.name,
        metadata: { org_id: org.id },
      })
      customerId = customer.id
      await supabase.from('organisations').update({ stripe_customer_id: customerId }).eq('id', org.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: (process.env.NEXT_PUBLIC_APP_URL || 'https://app.thot.team') + '/dashboard?activated=true',
      cancel_url: (process.env.NEXT_PUBLIC_APP_URL || 'https://app.thot.team') + '/dashboard?activated=false',
      metadata: { org_id: org.id, plan: org.plan },
      subscription_data: { metadata: { org_id: org.id, plan: org.plan } },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
