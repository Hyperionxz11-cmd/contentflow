import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ContentFlow promo posts — rotate daily
const PROMO_POSTS = [
  `🚀 Tu passes des heures à créer du contenu LinkedIn mais tu manques de régularité ?

ContentFlow planifie et publie automatiquement tes posts LinkedIn. Import DOCX, calendrier visuel, analytics avancées.

Essai gratuit → contentflow-gilt.vercel.app`,

  `💡 Les créateurs LinkedIn qui publient 3x/semaine font 5x plus d'impressions.

Le problème : trouver le temps chaque semaine.
La solution : ContentFlow — planifie 1 mois de contenu en 2h le dimanche.

Gratuit pour commencer → contentflow-gilt.vercel.app`,

  `📅 Mon secret pour publier sur LinkedIn sans y penser :

1. J'écris tout mon contenu du mois le week-end
2. Je l'importe en bloc dans ContentFlow
3. Il publie automatiquement au meilleur moment

Rejoins 5000+ créateurs → contentflow-gilt.vercel.app`,
]

async function postToReddit(content: string): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET
  const username = process.env.REDDIT_USERNAME
  const password = process.env.REDDIT_PASSWORD
  const subreddit = process.env.REDDIT_POST_SUBREDDIT || 'test'

  if (!clientId || !clientSecret || !username || !password) return null

  // Get access token
  const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'ContentFlow-Bot/1.0',
    },
    body: new URLSearchParams({ grant_type: 'password', username, password }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) return null

  const lines = content.split('\n')
  const title = lines[0].replace(/[🚀💡📅]/g, '').trim().substring(0, 300)
  const body = lines.slice(1).join('\n').trim()

  const postRes = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'ContentFlow-Bot/1.0',
    },
    body: new URLSearchParams({
      sr: subreddit,
      kind: 'self',
      title,
      text: body,
      nsfw: 'false',
      spoiler: 'false',
    }),
  })
  const postData = await postRes.json()
  return postData?.json?.data?.url || null
}

async function postToTwitter(content: string): Promise<string | null> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET
  const accessToken = process.env.TWITTER_ACCESS_TOKEN
  const accessSecret = process.env.TWITTER_ACCESS_SECRET

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null

  // Twitter API v2 - post tweet (requires OAuth 1.0a user context)
  // Using simple HMAC-SHA1 OAuth signing
  const tweetText = content.substring(0, 280)
  const url = 'https://api.twitter.com/2/tweets'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = Math.random().toString(36).substring(2)

  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  // Build signature
  const { createHmac } = await import('crypto')
  const paramStr = Object.entries(oauthParams)
    .sort()
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  const baseStr = `POST&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`
  const sigKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`
  const signature = createHmac('sha1', sigKey).update(baseStr).digest('base64')

  const authHeader = 'OAuth ' + Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ')

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: tweetText }),
  })
  const data = await res.json()
  return data.data?.id ? `https://twitter.com/i/web/status/${data.data.id}` : null
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET || 'pilier3-cron-2026'
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pick today's post (rotate by day of year)
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const postContent = PROMO_POSTS[dayOfYear % PROMO_POSTS.length]

  const results: Record<string, string | null> = {}

  const [redditUrl, twitterUrl] = await Promise.allSettled([
    postToReddit(postContent),
    postToTwitter(postContent),
  ])

  results.reddit = redditUrl.status === 'fulfilled' ? redditUrl.value : null
  results.twitter = twitterUrl.status === 'fulfilled' ? twitterUrl.value : null

  // Log to DB
  for (const [platform, url] of Object.entries(results)) {
    await supabase.from('auto_posts').insert({
      platform,
      content: postContent,
      post_url: url,
      status: url ? 'posted' : 'failed',
    })
  }

  return NextResponse.json({ success: true, posted: results })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
