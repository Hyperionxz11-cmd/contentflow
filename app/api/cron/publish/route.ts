import { NextRequest, NextResponse } from 'next/server'
import { publishPost } from '@/lib/linkedin'
import { getSupabaseAdmin } from '@/lib/supabase-server'

// This route is called by a cron job (Vercel Cron or external)
// It checks for scheduled posts that need to be published

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin()
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date().toISOString()

    // Find posts that should be published
    const { data: postsToPublish, error } = await supabase
      .from('posts')
      .select(`
        id, content, user_id,
        profiles!inner(linkedin_access_token, linkedin_user_id)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .limit(10) // Process 10 at a time

    if (error) throw error
    if (!postsToPublish || postsToPublish.length === 0) {
      return NextResponse.json({ message: 'No posts to publish', count: 0 })
    }

    let published = 0
    let failed = 0

    for (const post of postsToPublish) {
      const profile = (post as any).profiles
      if (!profile?.linkedin_access_token) {
        await supabase.from('posts').update({ status: 'failed', error_message: 'LinkedIn not connected' }).eq('id', post.id)
        failed++
        continue
      }

      try {
        const result = await publishPost(
          profile.linkedin_access_token,
          profile.linkedin_user_id,
          post.content
        )
        await supabase.from('posts').update({
          status: 'published',
          published_at: new Date().toISOString(),
          linkedin_post_id: result.id,
        }).eq('id', post.id)
        published++
      } catch (err: any) {
        await supabase.from('posts').update({
          status: 'failed',
          error_message: err.message,
        }).eq('id', post.id)
        failed++
      }
    }

    return NextResponse.json({ published, failed, total: postsToPublish.length })
  } catch (error: any) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
