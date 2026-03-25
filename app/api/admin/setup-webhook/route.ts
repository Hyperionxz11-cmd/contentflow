import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

const SETUP_TOKEN = process.env.SETUP_SECRET || 'contentflow-setup-2026'

export async function POST(request: NextRequest) {
  const { token } = await request.json()

  if (token !== SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 })
  }

  try {
    const params = new URLSearchParams()
    params.append('url', 'https://contentflow-gilt.vercel.app/api/stripe/webhook')
    params.append('enabled_events[]', 'checkout.session.completed')
    params.append('enabled_events[]', 'customer.subscription.deleted')
    params.append('description', 'ContentFlow production webhook')

    const res = await fetch('https://api.stripe.com/v1/webhook_endpoints', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + stripeKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Stripe API error', raw: data }, { status: 400 })
    }

    const signingSecret = data.secret

    const supabase = getSupabaseServer()
    await supabase.from('settings').upsert({
      key: 'stripe_webhook_secret',
      value: signingSecret,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      webhook_id: data.id,
      message: 'Webhook created and secret stored in Supabase settings',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
