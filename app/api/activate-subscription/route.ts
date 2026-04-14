import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })

const PLAN_PRICES: Record<string, string> = {
  starter: 'price_1TJJzoRpbK02np6XEHDbWqsX',
  business: 'price_1TJJzoRpbK02np6XCMclag3r',
  premium: 'price_1TJJzpRpbK02np6XtDXEDD9s',
}

const PLAN_SESSIONS: Record<string, number> = {
  starter: 25,
  business: 100,
  premium: 250,
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Get user profile + org
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data: org } = await supabase.from('organisations').select('*').eq('id', profile.organisation_id).single()
    if (!org) return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })

    const priceId = PLAN_PRICES[org.plan]
    if (!priceId) return NextResponse.json({ error: 'Forfait invalide' }, { status: 400 })

    // If already has a Stripe subscription, redirect to portal
    if (org.stripe_subscription_id) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: org.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.thot.team'}/dashboard`,
      })
      return NextResponse.json({ url: portalSession.url })
    }

    // Create or get Stripe customer
    let customerId = org.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || user.email,
        name: org.name,
        metadata: { org_id: org.id },
      })
      customerId = customer.id
      await supabase.from('organisations').update({ stripe_customer_id: customerId }).eq('id', org.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.thot.team'}/dashboard?activated=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.thot.team'}/dashboard?activated=false`,
      metadata: {
        org_id: org.id,
        plan: org.plan,
      },
      subscription_data: {
        metadata: {
          org_id: org.id,
          plan: org.plan,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('activate-subscription error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
