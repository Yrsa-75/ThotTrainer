import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })

const PLAN_LIMITS: Record<string, number> = { starter: 25, business: 75, premium: 200 }
const PLAN_PRICES_HT: Record<string, number> = { starter: 229, business: 549, premium: 990 }
const PLAN_DISPLAY_NAMES: Record<string, string> = { starter: 'Starter', business: 'Business', premium: 'Premium' }
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER!]: 'starter',
  [process.env.STRIPE_PRICE_BUSINESS!]: 'business',
  [process.env.STRIPE_PRICE_PREMIUM!]: 'premium',
}

// ===== Helpers envoi email via Edge Function Supabase =====
// Best-effort : les erreurs sont loggées mais ne plantent PAS le webhook
// (Stripe retenterait le webhook sinon et on créerait des incohérences DB)
async function sendThotEmail(
  template: 'welcome-signup' | 'subscription-activated',
  to: string,
  variables: Record<string, string>
): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const thotSecret = process.env.THOT_WEBHOOK_SECRET
    if (!supabaseUrl || !thotSecret) {
      console.error('[sendThotEmail] Missing NEXT_PUBLIC_SUPABASE_URL or THOT_WEBHOOK_SECRET')
      return
    }
    const res = await fetch(`${supabaseUrl}/functions/v1/send-thot-email`, {
      method: 'POST',
      headers: {
        'x-thot-secret': thotSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ template, to, variables }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[sendThotEmail] ${template} to ${to} failed: ${res.status} ${errText}`)
    }
  } catch (err: any) {
    console.error(`[sendThotEmail] ${template} to ${to} exception:`, err?.message || err)
  }
}

function formatFrDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildTrialStatusLine(plan: string, trialEndsAt: Date): string {
  const priceHT = PLAN_PRICES_HT[plan] ?? 0
  const displayName = PLAN_DISPLAY_NAMES[plan] ?? plan
  const monthlySessions = PLAN_LIMITS[plan] ?? 0
  return `Essai gratuit jusqu'au ${formatFrDate(trialEndsAt)}. Votre forfait ${displayName} vous donnera ${monthlySessions} sessions par mois dès l'activation (${priceHT} € HT / mois), qui se fera automatiquement à cette date depuis la carte que vous avez enregistrée. Vous pouvez annuler à tout moment depuis votre espace Abonnement.`
}

function buildActiveStatusLine(plan: string, nextRenewalAt: Date): string {
  const priceHT = PLAN_PRICES_HT[plan] ?? 0
  return `Facturation mensuelle : ${priceHT} € HT. Prochain prélèvement le ${formatFrDate(nextRenewalAt)}.`
}

// ===== Webhook handler =====
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
      const isTrialing = sub.status === 'trialing'
      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null

      await supabase.from('organisations').update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plan, sessions_limit: isTrialing ? 7 : (PLAN_LIMITS[plan] || 50), sessions_used: 0,
        status: isTrialing ? 'trialing' : 'active',
        trial_ends_at: trialEnd ? trialEnd.toISOString() : null,
        subscription_started_at: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }).eq('id', orgId)

      // ===== EMAIL : welcome_signup (envoyé après validation CB sur Stripe) =====
      // Cas 1 : signup initial avec trial 7j → envoi welcome_signup
      // Cas 2 : réactivation après annulation (sans trial) → envoi subscription_activated
      const { data: org } = await supabase.from('organisations').select('name').eq('id', orgId).single()
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('organisation_id', orgId)
        .eq('role', 'admin')
        .limit(1)
        .single()

      if (adminProfile?.email && org?.name) {
        const firstName = (adminProfile.full_name || '').split(' ')[0] || adminProfile.full_name || ''
        const planDisplay = PLAN_DISPLAY_NAMES[plan] ?? plan
        const sessionsLimit = String(isTrialing ? 7 : (PLAN_LIMITS[plan] || 50))

        if (isTrialing && trialEnd) {
          // Signup initial avec essai gratuit
          await sendThotEmail('welcome-signup', adminProfile.email, {
            admin_name: firstName,
            org_name: org.name,
            plan_name_display: planDisplay,
            sessions_limit: sessionsLimit,
            plan_status_line: buildTrialStatusLine(plan, trialEnd),
          })
        } else {
          // Réactivation après annulation (pas de trial, paiement immédiat)
          const nextRenewal = new Date(sub.current_period_end * 1000)
          await sendThotEmail('subscription-activated', adminProfile.email, {
            admin_name: firstName,
            org_name: org.name,
            plan_name_display: planDisplay,
            sessions_limit: sessionsLimit,
            plan_status_line: buildActiveStatusLine(plan, nextRenewal),
          })
        }
      }
      break
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any
      const reason = invoice.billing_reason
      if (reason !== 'subscription_cycle') break
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
      const priceId = sub.items.data[0]?.price.id
      const plan = priceId ? (PRICE_TO_PLAN[priceId] || 'starter') : 'starter'
      const { data: org } = await supabase.from('organisations').select('id, status, name').eq('stripe_subscription_id', invoice.subscription).single()
      if (org) {
        // Détecter si c'est le PREMIER paiement réel (fin de trial)
        // = org était en 'trialing' avant cet événement
        const wasTrialing = org.status === 'trialing'

        // Option B "geste commercial one-shot" : on reset TOUJOURS sessions_limit à la valeur du plan.
        // Cela signifie que les bonus ajoutés par le super admin sont valables pour le mois en cours
        // uniquement, et seront écrasés au prochain renouvellement.
        await supabase.from('organisations').update({
          status: 'active',
          plan,
          sessions_limit: PLAN_LIMITS[plan] || 50,
        }).eq('id', org.id)
        // Reset sessions_used + dates de periode
        await supabase.rpc('reset_session_counter', {
          org_id: org.id,
          new_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          new_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })

        // ===== EMAIL : subscription_activated (uniquement au 1er paiement réel, pas aux renouvellements) =====
        if (wasTrialing) {
          const { data: adminProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('organisation_id', org.id)
            .eq('role', 'admin')
            .limit(1)
            .single()

          if (adminProfile?.email && org.name) {
            const firstName = (adminProfile.full_name || '').split(' ')[0] || adminProfile.full_name || ''
            const planDisplay = PLAN_DISPLAY_NAMES[plan] ?? plan
            const nextRenewal = new Date(sub.current_period_end * 1000)
            await sendThotEmail('subscription-activated', adminProfile.email, {
              admin_name: firstName,
              org_name: org.name,
              plan_name_display: planDisplay,
              sessions_limit: String(PLAN_LIMITS[plan] || 50),
              plan_status_line: buildActiveStatusLine(plan, nextRenewal),
            })
          }
        }
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
