import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvsfclqlopzkfmeinbqs.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2c2ZjbHFsb3B6a2ZtZWluYnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3Mjc1NTMsImV4cCI6MjA4OTMwMzU1M30.ka5xQQVdHSslk12iu7vRtWlk9CgpKm5jiDpskeJ1-Bw'
const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/anthropic-reformulate`

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()

    // ── Quota check ──
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    })
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (user) {
      const supabase = getSupabaseServer()
      const { data: quota } = await supabase.rpc('check_and_increment_ai_usage', {
        p_user_id: user.id,
        p_action: 'reformulation',
      })
      if (quota && !quota.allowed) {
        return NextResponse.json({
          error: `Quota reformulations atteint (${quota.current}/${quota.limit} ce mois). Passe au plan supérieur pour continuer.`,
          quota_exceeded: true,
          plan: quota.plan,
        }, { status: 429 })
      }
    }

    const prompt = `Tu es un expert LinkedIn avec 10 ans d'expérience en content marketing B2B francophone.

Voici un post LinkedIn brut à reformuler :
"""
${content.slice(0, 3000)}
"""

Génère EXACTEMENT 3 reformulations optimisées pour LinkedIn en français. Chaque variante doit :
- Avoir un hook puissant (1ère ligne qui donne envie de cliquer "voir plus")
- Utiliser des sauts de ligne aérés (style LinkedIn)
- Inclure 3-5 hashtags pertinents à la fin
- Terminer par un call-to-action engageant
- Faire entre 800 et 1400 caractères

Réponds UNIQUEMENT en JSON valide (pas de texte avant ou après) :
{
  "variants": [
    {
      "format": "Storytelling",
      "description": "Narration personnelle avec leçon clé",
      "content": "..."
    },
    {
      "format": "Liste engageante",
      "description": "Format liste numérotée avec insights actionnables",
      "content": "..."
    },
    {
      "format": "Hook + CTA fort",
      "description": "Question choc ou stat surprenante + appel à l'action",
      "content": "..."
    }
  ]
}`

    const resp = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      console.error('Anthropic API error:', errText)
      return NextResponse.json({ error: 'Erreur API IA — réessaie dans quelques secondes.' }, { status: 500 })
    }

    const data = await resp.json()
    const text = data.content?.[0]?.text || ''

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Format de réponse IA invalide.' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('Reformulate route error:', err)
    return NextResponse.json({ error: err.message || 'Erreur interne.' }, { status: 500 })
  }
}
