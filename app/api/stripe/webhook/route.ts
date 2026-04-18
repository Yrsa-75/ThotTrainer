import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })

const PLAN_LIMITS: Record<string, number> = { starter: 25, business: 75, premium: 200 }
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER!]: 'starter',
  [process.env.STRIPE_PRICE_BUSINESS!]: 'business',
  [process.env.STRIPE_PRICE_PREMIUM!]: 'premium',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const supabase = createServiceSupabase()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.organisation_id
      if (!orgId) break
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const priceId = sub.items.data[0].price.id
      const plan = PRICE_TO_PLAN[priceId] || 'starter'
      await supabase.from('organisations').update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plan, sessions_limit: sub.status === 'trialing' ? 7 : (PLAN_LIMITS[plan] || 50), sessions_used: 0,
        status: sub.status === 'trialing' ? 'trialing' : 'active',
        trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        subscription_started_at: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }).eq('id', orgId)
      break
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any
      const reason = invoice.billing_reason
      if (reason !== 'subscription_create' && reason !== 'subscription_cycle') break
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
      const priceId = sub.items.data[0]?.price.id
      const plan = priceId ? (PRICE_TO_PLAN[priceId] || 'starter') : 'starter'
      const { data: org } = await supabase.from('organisations').select('id, status').eq('stripe_subscription_id', invoice.subscription).single()
      if (org) {
        // Fin de trial (subscription_create) ou bascule defensive : bump sessions_limit au plan
        if (reason === 'subscription_create' || org.status === 'trialing') {
          await supabase.from('organisations').update({
            status: 'active',
            plan,
            sessions_limit: PLAN_LIMITS[plan] || 50,
          }).eq('id', org.id)
        }
        // Reset sessions_used + dates de periode (preserve sessions_limit pour les gestes commerciaux)
        await supabase.rpc('reset_session_counter', {
          org_id: org.id,
          new_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          new_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
      }
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as any
      await supabase.from('organisations').update({ status: 'past_due' }).eq('stripe_subscription_id', invoice.subscription)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('organisations').update({ status: 'cancelled', plan: 'cancelled' }).eq('stripe_subscription_id', sub.id)
      break
    }
  }
  return NextResponse.json({ received: true })
}
