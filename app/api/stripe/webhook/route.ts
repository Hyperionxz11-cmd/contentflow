import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await request.text()
  const event = JSON.parse(body)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id

    await supabase.from('profiles').update({
      plan: 'premium',
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
    }).eq('id', userId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    await supabase.from('profiles')
      .update({ plan: 'free', stripe_subscription_id: null })
      .eq('stripe_customer_id', sub.customer)
  }

  return NextResponse.json({ received: true })
}
