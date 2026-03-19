import { NextRequest, NextResponse } from 'next/server'
import { publishPost } from '@/lib/linkedin'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer()
  try {
    const { postId, userId } = await request.json()

    // Get user's LinkedIn token via RPC (SECURITY DEFINER)
    const { data: credentials, error: credError } = await supabase.rpc('get_linkedin_credentials', {
      p_user_id: userId
    })

    if (credError || !credentials || credentials.length === 0 || !credentials[0].linkedin_access_token) {
      return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 401 })
    }

    const profile = credentials[0]

    // Get post content via RPC
    const { data: posts, error: postError } = await supabase.rpc('get_post_content', {
      p_post_id: postId
    })

    if (postError || !posts || posts.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const post = posts[0]

    // Publish to LinkedIn
    const result = await publishPost(
      profile.linkedin_access_token,
      profile.linkedin_user_id,
      post.content
    )

    // Update post status via RPC
    await supabase.rpc('update_post_published', {
      p_post_id: postId,
      p_linkedin_post_id: result.id
    })

    return NextResponse.json({ success: true, linkedinPostId: result.id })
  } catch (error: any) {
    console.error('Publish error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
