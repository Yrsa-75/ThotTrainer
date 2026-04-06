import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

const PLAN_LIMITS: Record<string, number> = {
  starter: 50,
  business: 200,
  premium: 500,
}

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
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      if (!orgId) break
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = sub.items.data[0].price.id
      const plan = PRICE_TO_PLAN[priceId] || 'starter'
      const sessionsLimit = PLAN_LIMITS[plan] || 50
      const isTrialing = sub.status === 'trialing'
      const periodStart = new Date(sub.current_period_start * 1000).toISOString()
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString()
      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
      await supabase.from('organisations').update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan,
        sessions_limit: sessionsLimit,
        sessions_used: 0,
        status: isTrialing ? 'trialing' : 'active',
        trial_ends_at: trialEnd,
        subscription_started_at: periodStart,
        current_period_start: periodStart,
        current_period_end: periodEnd,
      }).eq('id', orgId)
      break
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.billing_reason !== 'subscription_cycle') break
      const subscriptionId = invoice.subscription as string
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const periodStart = new Date(sub.current_period_start * 1000).toISOString()
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString()
      const { data: org } = await supabase.from('organisations').select('id').eq('stripe_subscription_id', subscriptionId).single()
      if (org) {
        await supabase.rpc('reset_session_counter', { org_id: org.id, new_period_start: periodStart, new_period_end: periodEnd })
        const priceId = sub.items.data[0].price.id
        const plan = PRICE_TO_PLAN[priceId] || 'starter'
        await supabase.from('subscriptions').insert({ organisation_id: org.id, stripe_subscription_id: subscriptionId, stripe_invoice_id: invoice.id, plan, amount_eur: invoice.amount_paid, status: 'paid', period_start: periodStart, period_end: periodEnd })
      }
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await supabase.from('organisations').update({ status: 'past_due' }).eq('stripe_subscription_id', invoice.subscription as string)
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0].price.id
      const plan = PRICE_TO_PLAN[priceId] || 'starter'
      const sessionsLimit = PLAN_LIMITS[plan] || 50
      const status = sub.status === 'trialing' ? 'trialing' : sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'cancelled'
      await supabase.from('organisations').update({ plan, sessions_limit: sessionsLimit, status, current_period_start: new Date(sub.current_period_start * 1000).toISOString(), current_period_end: new Date(sub.current_period_end * 1000).toISOString() }).eq('stripe_subscription_id', sub.id)
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
