import { NextRequest, NextResponse } from 'next/server'

// Stripe Payment Link created via Stripe API
// Supports client_reference_id as URL parameter
const PAYMENT_LINK_URL = 'https://buy.stripe.com/bJe14n6PtfYYaWS7ha5kk00'

export async function POST(request: NextRequest) {
  const { userId } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  // Append client_reference_id to the payment link URL
  // Stripe will include this in the checkout.session.completed webhook event
  const checkoutUrl = `${PAYMENT_LINK_URL}?client_reference_id=${encodeURIComponent(userId)}`

  return NextResponse.json({ url: checkoutUrl })
}
