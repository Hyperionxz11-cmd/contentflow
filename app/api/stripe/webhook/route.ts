import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer()
  const body = await request.text()
  const event = JSON.parse(body)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id

    await supabase.rpc('update_user_plan_checkout', {
      p_user_id: userId,
      p_plan: 'premium',
      p_customer_id: session.customer,
      p_subscription_id: session.subscription,
    })
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    await supabase.rpc('cancel_user_subscription', {
      p_customer_id: sub.customer
    })
  }

  return NextResponse.json({ received: true })
}
