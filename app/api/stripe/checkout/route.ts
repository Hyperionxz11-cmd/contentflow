import { NextRequest, NextResponse } from 'next/server'

// Payment links créés via Stripe MCP — 2026-03-27
// Solo  19€/mois : price_1TFEfYFjKl5nqEXCb4YtsD78 → prod_UDg1j8qnlPtb6a
// Agence 59€/mois : price_1TFEfcFjKl5nqEXCGNvbWljN → prod_UDg1atmnISc9zj
const PAYMENT_LINKS: Record<string, string> = {
  solo:   'https://buy.stripe.com/7sYeVd0r54gg1mi7ha5kk03',
  agence: 'https://buy.stripe.com/9B628rb5J3cc4yueJC5kk04',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const plan = (searchParams.get('plan') || 'solo').toLowerCase()
  const userId = searchParams.get('userId') || ''

  const baseUrl = PAYMENT_LINKS[plan] || PAYMENT_LINKS['solo']
  const checkoutUrl = userId
    ? `${baseUrl}?client_reference_id=${encodeURIComponent(userId)}`
    : baseUrl

  return NextResponse.redirect(checkoutUrl)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const plan = ((body.plan as string) || 'solo').toLowerCase()
  const userId = (body.userId as string) || ''

  const baseUrl = PAYMENT_LINKS[plan] || PAYMENT_LINKS['solo']
  const checkoutUrl = userId
    ? `${baseUrl}?client_reference_id=${encodeURIComponent(userId)}`
    : baseUrl

  return NextResponse.json({ url: checkoutUrl })
}
