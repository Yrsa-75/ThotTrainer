import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase.from('plan_catalog').select('*').order('price')
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json([], { status: 500 })
  }
}
