import { NextRequest, NextResponse } from 'next/server'

// Stripe Payment Links (created via Stripe API)
const PAYMENT_LINKS: Record<string, string> = {
    pro: 'https://buy.stripe.com/28E28rddR5kk0ieatm5kk01',     // €19/month
    agence: 'https://buy.stripe.com/aFabJ1ehV9AA3uqgRK5kk02',  // €59/month
}

export async function POST(request: NextRequest) {
    const { userId, plan = 'pro' } = await request.json()

  if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  const baseUrl = PAYMENT_LINKS[plan] || PAYMENT_LINKS.pro
    const checkoutUrl = `${baseUrl}?client_reference_id=${encodeURIComponent(userId)}`

  return NextResponse.json({ url: checkoutUrl })
}
