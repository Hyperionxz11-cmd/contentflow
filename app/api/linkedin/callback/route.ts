import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getLinkedInProfile } from '@/lib/linkedin'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard?error=linkedin_auth_failed', appUrl))
  }

  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code)
    const accessToken = tokenData.access_token

    // Get LinkedIn profile
    const linkedinProfile = await getLinkedInProfile(accessToken)

    // Get current authenticated user from cookies
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (user) {
      // Store LinkedIn tokens via RPC (SECURITY DEFINER)
      const supabase = getSupabaseServer()
      await supabase.rpc('store_linkedin_tokens', {
        p_user_id: user.id,
        p_access_token: accessToken,
        p_linkedin_user_id: linkedinProfile.sub,
        p_linkedin_name: linkedinProfile.name
      })
    }

    return NextResponse.redirect(
      `${appUrl}/dashboard?linkedin=connected&name=${encodeURIComponent(linkedinProfile.name)}`
    )
  } catch (err) {
    console.error('LinkedIn callback error:', err)
    return NextResponse.redirect(new URL('/dashboard?error=linkedin_callback_failed', appUrl))
  }
}
