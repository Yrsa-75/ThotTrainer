import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })

export async function POST(req: NextRequest) {
  try {
    const { priceId, orgName, adminEmail, adminName, orgId } = await req.json()
    if (!priceId || !orgName || !adminEmail || !orgId) {
      return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 })
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: adminEmail,
      subscription_data: { trial_period_days: 7, metadata: { organisation_id: orgId, org_name: orgName } },
      metadata: { organisation_id: orgId, org_name: orgName },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/register?cancelled=1`,
      locale: 'fr',
    })
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
