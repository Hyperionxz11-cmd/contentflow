import { NextRequest, NextResponse } from 'next/server'
import { publishPost } from '@/lib/linkedin'
import { getSupabaseServer } from '@/lib/supabase-server'

// Cron job: publishes scheduled posts via SECURITY DEFINER RPC functions

export async function GET(request: NextRequest) {
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseServer()

  try {
    // Get posts due for publishing via RPC (bypasses RLS via SECURITY DEFINER)
    const { data: postsToPublish, error } = await supabase.rpc('get_posts_to_publish')

    if (error) throw error
    if (!postsToPublish || postsToPublish.length === 0) {
      return NextResponse.json({ message: 'No posts to publish', count: 0 })
    }

    let published = 0
    let failed = 0

    for (const post of postsToPublish) {
      if (!post.linkedin_access_token) {
        await supabase.rpc('mark_post_failed', { p_post_id: post.post_id })
        failed++
        continue
      }

      try {
        const result = await publishPost(
          post.linkedin_access_token,
          post.linkedin_user_id,
          post.content
        )
        await supabase.rpc('mark_post_published', {
          p_post_id: post.post_id,
          p_linkedin_post_id: result.id
        })
        published++
      } catch (err: any) {
        await supabase.rpc('mark_post_failed', { p_post_id: post.post_id })
        failed++
      }
    }

    return NextResponse.json({ published, failed, total: postsToPublish.length })
  } catch (error: any) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
