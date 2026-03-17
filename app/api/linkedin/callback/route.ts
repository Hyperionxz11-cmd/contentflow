import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getLinkedInProfile } from '@/lib/linkedin'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard?error=linkedin_auth_failed', request.url))
  }

  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code)
    const accessToken = tokenData.access_token

    // Get LinkedIn profile
    const linkedinProfile = await getLinkedInProfile(accessToken)

    // TODO: Get the current Supabase user from cookie/session
    // For now, we'll store the token based on LinkedIn sub
    // In production, use middleware to get the current user

    // Update profile with LinkedIn data
    // This requires knowing the current user - simplified for MVP
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.redirect(
      `${appUrl}/dashboard?linkedin=connected&name=${encodeURIComponent(linkedinProfile.name)}`
    )
  } catch (err) {
    console.error('LinkedIn callback error:', err)
    return NextResponse.redirect(new URL('/dashboard?error=linkedin_callback_failed', request.url))
  }
}
