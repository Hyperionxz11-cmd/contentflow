import { NextResponse } from 'next/server'
import { getLinkedInAuthUrl } from '@/lib/linkedin'

export async function GET() {
  const authUrl = getLinkedInAuthUrl()
  return NextResponse.redirect(authUrl)
}
