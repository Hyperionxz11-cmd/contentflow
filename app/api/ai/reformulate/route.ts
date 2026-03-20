import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvsfclqlopzkfmeinbqs.supabase.co'
const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/anthropic-reformulate`

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()

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
