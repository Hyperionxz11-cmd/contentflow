import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé ANTHROPIC_API_KEY non configurée dans les variables d\'environnement Vercel.' }, { status: 503 })
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

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
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
