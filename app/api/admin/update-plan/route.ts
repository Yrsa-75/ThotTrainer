import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })

const PLAN_PRICE_ENV: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  business: process.env.STRIPE_PRICE_BUSINESS!,
  premium: process.env.STRIPE_PRICE_PREMIUM!,
}

export async function POST(req: NextRequest) {
  try {
    const { plan, newSessions, newPrice } = await req.json()
    if (!plan || !['starter','business','premium'].includes(plan)) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    const supabase = createServiceSupabase()
    const results: any = { plan, sessionsUpdated: false, priceUpdated: false, subsUpdated: 0 }

    // 1. Mettre à jour sessions_limit pour toutes les orgs de ce plan
    if (newSessions && newSessions > 0) {
      await supabase.from('organisations').update({ sessions_limit: newSessions }).eq('plan', plan)
      results.sessionsUpdated = true
    }

    // 2. Si changement de prix → créer nouveau prix Stripe + migrer abonnements
    if (newPrice && newPrice > 0) {
      const currentPriceId = PLAN_PRICE_ENV[plan]

      // Récupérer le produit associé au prix actuel
      const currentPrice = await stripe.prices.retrieve(currentPriceId)
      const productId = currentPrice.product as string

      // Créer un nouveau prix dans Stripe
      const newStripePrice = await stripe.prices.create({
        currency: 'eur',
        unit_amount: Math.round(newPrice * 100),
        recurring: { interval: 'month' },
        product: productId,
        nickname: plan + '_' + new Date().toISOString().slice(0,10),
      })

      // Archiver l'ancien prix
      await stripe.prices.update(currentPriceId, { active: false })

      // Migrer tous les abonnements actifs de ce plan vers le nouveau prix
      const subs = await stripe.subscriptions.list({ price: currentPriceId, status: 'active', limit: 100 })
      for (const sub of subs.data) {
        const item = sub.items.data[0]
        await stripe.subscriptions.update(sub.id, {
          items: [{ id: item.id, price: newStripePrice.id }],
          proration_behavior: 'none', // Pas de prorata, changement au prochain renouvellement
        })
        results.subsUpdated++
      }

      // Mettre à jour la variable d'env serait idéal mais impossible en runtime
      // → On stocke le nouveau price_id dans platform_config comme fallback
      await supabase.from('platform_config').update({
        [`stripe_price_${plan}`]: newStripePrice.id
      }).not('id', 'is', null)

      results.priceUpdated = true
      results.newPriceId = newStripePrice.id
      results.oldPriceId = currentPriceId
    }

    
    // Mettre à jour le catalogue si sessions/price fournis
    if (sessions || price) {
      const catalogData: any = {}
      if (sessions) catalogData.sessions = sessions
      if (price) catalogData.price = price
      catalogData.updated_at = new Date().toISOString()
      await supabase.from('plan_catalog').update(catalogData).eq('plan_id', planId)
    }

    return NextResponse.json({ success: true, ...results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
