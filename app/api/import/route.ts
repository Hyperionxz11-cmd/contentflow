import { NextRequest, NextResponse } from 'next/server'

// Découper le texte en posts individuels
function splitIntoPosts(rawText: string): string[] {
  let posts: string[] = []

  // 1. Séparateur explicite --- ou ===
  if (rawText.includes('---')) {
    posts = rawText.split(/---+/).map(p => p.trim()).filter(p => p.length > 0)
  } else if (rawText.includes('===')) {
    posts = rawText.split(/===+/).map(p => p.trim()).filter(p => p.length > 0)
  }
  // 2. Docs Word avec headers en majuscules (ex: FONDAMENTAUX, PATRIMOINE, ACTUALITÉS…)
  //    Structure : CATÉGORIE\n\nTitre du post\n\n\n\nContenu du post
  //    On coupe avant chaque header en majuscules précédé de 2+ newlines
  else if (/\n{2,}[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ\s]{4,}\n\n/.test(rawText)) {
    const raw = rawText
      .split(/\n{2,}(?=[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ\s]{4,}\n\n)/)
      .map(p => p.trim())
      .filter(p => {
        if (!p || p.length < 100) return false
        const firstLine = p.split('\n')[0].trim()
        // La 1ère ligne doit être entièrement en majuscules (header de section)
        return (
          firstLine.length >= 4 &&
          firstLine === firstLine.toUpperCase() &&
          /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]/.test(firstLine)
        )
      })
    posts = raw
  }
  // 3. Triple saut de ligne
  else if (rawText.includes('\n\n\n')) {
    posts = rawText.split(/\n{3,}/).map(p => p.trim()).filter(p => p.length > 0)
  }
  // 4. Posts numérotés (1. ou 1) au début d'une ligne)
  else if (/^\d+[\.\)]/m.test(rawText)) {
    posts = rawText
      .split(/\n(?=\d+[\.\)]\s)/)
      .map(p => p.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(p => p.length > 0)
  }
  // 5. Fallback : double saut de ligne + smart merge des titres courts
  else {
    const raw = rawText.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0)
    const merged: string[] = []
    let i = 0
    while (i < raw.length) {
      const current = raw[i]
      const lines = current.split('\n').filter(l => l.trim())
      const isTitle =
        lines.length <= 2 &&
        current.length < 130 &&
        !current.match(/[.?!…]$/) &&
        i + 1 < raw.length
      if (isTitle) {
        merged.push(current + '\n\n' + raw[i + 1])
        i += 2
      } else {
        merged.push(current)
        i++
      }
    }
    posts = merged
  }

  return posts
    .filter(p => p.length >= 50)
    .slice(0, 100)
}

export async function POST(request: NextRequest) {
  const headers = { 'Content-Type': 'application/json' }

  try {
    const contentType = request.headers.get('content-type') || ''
    let rawText = ''
    let filename = 'import'

    if (contentType.includes('application/json')) {
      // ✅ Chemin principal : texte extrait côté client (DOCX traité dans le navigateur)
      const body = await request.json()
      rawText = body.text || ''
      filename = body.filename || 'import'
    } else if (contentType.includes('multipart/form-data')) {
      // Legacy FormData : uniquement pour .txt / .md (petits fichiers)
      let formData: FormData
      try {
        formData = await request.formData()
      } catch (e: any) {
        return new Response(
          JSON.stringify({ error: `Erreur de lecture : ${e.message}` }),
          { status: 400, headers }
        )
      }

      const file = formData.get('file') as File | null
      if (!file) {
        return new Response(JSON.stringify({ error: 'Aucun fichier fourni' }), { status: 400, headers })
      }

      filename = file.name

      if (file.name.toLowerCase().match(/\.(txt|md|csv)$/)) {
        rawText = await file.text()
      } else {
        return new Response(
          JSON.stringify({ error: 'Pour les fichiers DOCX, utilise la dernière version de l\'interface.' }),
          { status: 400, headers }
        )
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Content-Type non supporté.' }),
        { status: 400, headers }
      )
    }

    if (!rawText || rawText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Le fichier semble vide ou illisible.' }),
        { status: 400, headers }
      )
    }

    const posts = splitIntoPosts(rawText)

    if (posts.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Aucun post détecté. Sépare tes posts avec --- ou laisse une ligne vide entre chacun.',
          rawPreview: rawText.slice(0, 300),
        }),
        { status: 400, headers }
      )
    }

    return new Response(
      JSON.stringify({ posts, count: posts.length, filename }),
      { status: 200, headers }
    )
  } catch (error: any) {
    console.error('Import error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { status: 500, headers }
    )
  }
}
