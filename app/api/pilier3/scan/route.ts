import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Keywords that indicate someone needs ContentFlow
const KEYWORDS = [
  'linkedin scheduling', 'linkedin content', 'linkedin posts', 'linkedin creator',
  'schedule linkedin', 'content calendar linkedin', 'linkedin automation',
  'publish linkedin', 'linkedin strategy', 'linkedin growth',
  'créateur linkedin', 'contenu linkedin', 'planifier linkedin',
]

const SUBREDDITS = [
  'Entrepreneur', 'SideProject', 'startups', 'marketing',
  'socialmedia', 'content_marketing', 'LinkedInTips',
  'growthhacking', 'digitalmarketing', 'smallbusiness',
]

function scoreRelevance(text: string): number {
  const lower = text.toLowerCase()
  let score = 0
  for (const kw of KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) score += 1
  }
  // Boost posts asking for help/tools
  if (lower.includes('how to') || lower.includes('best tool') || lower.includes('recommend')) score += 0.5
  if (lower.includes('help') || lower.includes('struggling') || lower.includes('advice')) score += 0.5
  if (lower.includes('automate') || lower.includes('save time') || lower.includes('efficient')) score += 0.5
  return score
}

async function scanReddit(): Promise<number> {
  let found = 0
  for (const subreddit of SUBREDDITS) {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent('linkedin content scheduling')}&sort=new&limit=25&t=week`,
        { headers: { 'User-Agent': 'ContentFlow-Bot/1.0' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      const posts = data?.data?.children || []
      for (const { data: post } of posts) {
        const text = (post.title || '') + ' ' + (post.selftext || '')
        const relevance = scoreRelevance(text)
        if (relevance < 1) continue
        const { error } = await supabase.from('prospects').upsert({
          platform: 'reddit',
          post_id: post.id,
          post_url: `https://reddit.com${post.permalink}`,
          post_title: post.title?.substring(0, 500),
          post_content: post.selftext?.substring(0, 2000),
          author: post.author,
          subreddit: post.subreddit,
          score: post.score || 0,
          relevance_score: relevance,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'platform,post_id', ignoreDuplicates: true })
        if (!error) found++
      }
    } catch {}
  }
  return found
}

async function scanTwitter(): Promise<number> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN
  if (!bearerToken) return 0
  let found = 0
  const queries = [
    'linkedin scheduling tool -is:retweet lang:en',
    'linkedin content creator tool -is:retweet lang:en',
    'planifier linkedin outil -is:retweet lang:fr',
  ]
  for (const query of queries) {
    try {
      const res = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=20&tweet.fields=author_id,created_at,public_metrics,text`,
        { headers: { Authorization: `Bearer ${bearerToken}` } }
      )
      if (!res.ok) continue
      const data = await res.json()
      for (const tweet of data.data || []) {
        const relevance = scoreRelevance(tweet.text)
        if (relevance < 0.5) continue
        const { error } = await supabase.from('prospects').upsert({
          platform: 'twitter',
          post_id: tweet.id,
          post_url: `https://twitter.com/i/web/status/${tweet.id}`,
          post_content: tweet.text?.substring(0, 2000),
          author: tweet.author_id,
          score: (tweet.public_metrics?.like_count || 0) + (tweet.public_metrics?.retweet_count || 0),
          relevance_score: relevance,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'platform,post_id', ignoreDuplicates: true })
        if (!error) found++
      }
    } catch {}
  }
  return found
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET || 'pilier3-cron-2026'
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [redditFound, twitterFound] = await Promise.all([
    scanReddit(),
    scanTwitter(),
  ])

  return NextResponse.json({
    success: true,
    reddit: redditFound,
    twitter: twitterFound,
    total: redditFound + twitterFound,
    scanned_at: new Date().toISOString(),
  })
}

// Allow GET for manual trigger from dashboard
export async function GET(req: NextRequest) {
  return POST(req)
}
