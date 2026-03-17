import { NextRequest, NextResponse } from 'next/server'
import { publishPost } from '@/lib/linkedin'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin()
  try {
    const { postId, userId } = await request.json()

    // Get user's LinkedIn token from DB
    const { data: profile } = await supabase
      .from('profiles')
      .select('linkedin_access_token, linkedin_user_id')
      .eq('id', userId)
      .single()

    if (!profile?.linkedin_access_token) {
      return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 401 })
    }

    // Get post content
    const { data: post } = await supabase
      .from('posts')
      .select('content')
      .eq('id', postId)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Publish to LinkedIn
    const result = await publishPost(
      profile.linkedin_access_token,
      profile.linkedin_user_id,
      post.content
    )

    // Update post status
    await supabase
      .from('posts')
      .update({ status: 'published', published_at: new Date().toISOString(), linkedin_post_id: result.id })
      .eq('id', postId)

    return NextResponse.json({ success: true, linkedinPostId: result.id })
  } catch (error: any) {
    console.error('Publish error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
