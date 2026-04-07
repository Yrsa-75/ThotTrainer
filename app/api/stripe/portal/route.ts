import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await req.json()
    if (!orgId) return NextResponse.json({ error: 'orgId requis' }, { status: 400 })

    const supabase = createServiceSupabase()
    const { data: org } = await supabase.from('organisations').select('stripe_customer_id, name').eq('id', orgId).single()
    if (!org?.stripe_customer_id) return NextResponse.json({ error: 'Pas de client Stripe pour cette organisation' }, { status: 404 })

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
