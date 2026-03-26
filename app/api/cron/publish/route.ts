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
              // Check if LinkedIn access token exists
          if (!post.linkedin_access_token) {
                    await supabase.rpc('mark_post_failed', { p_post_id: post.post_id })
                    failed++
                    continue
          }

          // Check if LinkedIn token is expired
          if (post.linkedin_token_expires_at) {
                    const tokenExpiry = new Date(post.linkedin_token_expires_at)
                    if (tokenExpiry < new Date()) {
                                console.warn(`LinkedIn token expired for user ${post.user_id}. Post ${post.post_id} skipped.`)
                                await supabase.rpc('mark_post_failed', { p_post_id: post.post_id })
                                // Mark LinkedIn as disconnected so the user gets alerted in the dashboard
                      await supabase
                                  .from('profiles')
                                  .update({ linkedin_connected: false })
                                  .eq('id', post.user_id)
                                failed++
                                continue
                    }

                // Warn if token expires within 7 days (but still publish)
                const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    if (tokenExpiry < sevenDaysFromNow) {
                                console.warn(`LinkedIn token for user ${post.user_id} expires soon: ${tokenExpiry.toISOString()}`)
                    }
          }

          try {
                    const result = await publishPost(
                                post.linkedin_access_token,
                                post.linkedin_user_id,
                                post.content,
                                Array.isArray(post.images) && post.images.length > 0 ? post.images : undefined
                              )

                await supabase.rpc('mark_post_published', {
                            p_post_id: post.post_id,
                            p_linkedin_post_id: result.id,
                })
                    published++
          } catch (err: any) {
                    console.error(`Failed to publish post ${post.post_id}:`, err.message)
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
