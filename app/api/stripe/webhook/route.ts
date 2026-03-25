import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'

const PLAN_BY_AMOUNT: Record<number, string> = {
  1900: 'pro',
  5900: 'agence',
}

// Cache in memory to avoid Supabase call on every request
let cachedWebhookSecret: string | null = null

async function getWebhookSecret(): Promise<string | null> {
  if (process.env.STRIPE_WEBHOOK_SECRET) return process.env.STRIPE_WEBHOOK_SECRET
  if (cachedWebhookSecret) return cachedWebhookSecret
  const supabase = getSupabaseServer()
  const { data } = await supabase.from('settings').select('value').eq('key', 'stripe_webhook_secret').single()
  if (data?.value) {
    cachedWebhookSecret = data.value
    return data.value
  }
  return null
}

function verifyStripeSignature(body: string, signature: string, secret: string): boolean {
  const parts = signature.split(',')
  const tPart = parts.find((p) => p.startsWith('t='))
  const v1Part = parts.find((p) => p.startsWith('v1='))
  if (!tPart || !v1Part) return false
  const timestamp = tPart.slice(2)
  const v1 = v1Part.slice(3)
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false
  const payload = timestamp + '.' + body
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer()
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = await getWebhookSecret()

  if (webhookSecret) {
    if (!signature || !verifyStripeSignature(body, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  const event = JSON.parse(body)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id
    const amountTotal = session.amount_total as number
    const plan = PLAN_BY_AMOUNT[amountTotal] || 'pro'
    await supabase.rpc('update_user_plan_checkout', {
      p_user_id: userId,
      p_plan: plan,
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
