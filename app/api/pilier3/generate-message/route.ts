import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function generateMessage(prospect: any): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const platform = prospect.platform === 'reddit' ? 'Reddit' : 'Twitter/X'
  const context = prospect.post_title
    ? `Titre: ${prospect.post_title}\nContenu: ${(prospect.post_content || '').substring(0, 500)}`
    : `Post: ${(prospect.post_content || '').substring(0, 600)}`

  const prompt = `Tu es un expert en prospection pour ContentFlow, un SaaS de planification et publication de contenu LinkedIn.

Voici un post ${platform} d'un potentiel prospect :
---
${context}
---
Auteur: @${prospect.author || 'unknown'}
${prospect.subreddit ? `Subreddit: r/${prospect.subreddit}` : ''}

Écris un message de prospection court (3-4 phrases MAX) qui :
1. Fait référence spécifiquement à ce qu'il a dit (montre que tu as lu)
2. Introduit ContentFlow naturellement comme solution à son problème
3. Propose un essai gratuit ou une démo
4. Ton : humain, direct, pas de spam

Réponds UNIQUEMENT avec le message, sans guillemets ni explication.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET || 'pilier3-cron-2026'
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch new prospects without messages
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('status', 'new')
    .gte('relevance_score', 1)
    .order('relevance_score', { ascending: false })
    .limit(20)

  if (error || !prospects?.length) {
    return NextResponse.json({ success: true, processed: 0 })
  }

  let processed = 0
  for (const prospect of prospects) {
    try {
      const message = await generateMessage(prospect)
      if (!message) continue
      await supabase.from('prospects').update({
        message_generated: message,
        status: 'message_ready',
        updated_at: new Date().toISOString(),
      }).eq('id', prospect.id)
      processed++
    } catch {}
  }

  return NextResponse.json({ success: true, processed })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
