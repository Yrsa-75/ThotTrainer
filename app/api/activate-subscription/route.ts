import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const PLAN_PRICES: Record<string, string> = {
  starter: 'price_1TJJzoRpbK02np6XEHDbWqsX',
  business: 'price_1TJJzoRpbK02np6XCMclag3r',
  premium: 'price_1TJJzpRpbK02np6XtDXEDD9s',
}

export async function POST(req: Request) {
  try {
    // Get user from auth header
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data: org } = await supabaseAdmin.from('organisations').select('*').eq('id', profile.organisation_id).single()
    if (!org) return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })

    const priceId = PLAN_PRICES[org.plan]
    if (!priceId) return NextResponse.json({ error: 'Forfait invalide' }, { status: 400 })

    // If already has a Stripe subscription, redirect to portal
    if (org.stripe_subscription_id) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: org.stripe_customer_id,
        return_url: process.env.NEXT_PUBLIC_APP_URL || 'https://app.thot.team',
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
      await supabaseAdmin.from('organisations').update({ stripe_customer_id: customerId }).eq('id', org.id)
    }

    // Create checkout session
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
  } catch (e: any) {
    console.error('activate-subscription error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
