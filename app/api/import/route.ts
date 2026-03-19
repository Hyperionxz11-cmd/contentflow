import { NextRequest, NextResponse } from 'next/server'

// Découper le texte en posts individuels
function splitIntoPosts(rawText: string): string[] {
  let posts: string[] = []

  // 1. Séparateur --- ou ===
  if (rawText.includes('---')) {
    posts = rawText.split(/---+/).map(p => p.trim()).filter(p => p.length > 0)
  } else if (rawText.includes('===')) {
    posts = rawText.split(/===+/).map(p => p.trim()).filter(p => p.length > 0)
  }
  // 2. Triple saut de ligne
  else if (rawText.includes('\n\n\n')) {
    posts = rawText.split(/\n{3,}/).map(p => p.trim()).filter(p => p.length > 0)
  }
  // 3. Posts numérotés (1. ou 1) au début d'une ligne)
  else if (/^\d+[\.\)]/m.test(rawText)) {
    posts = rawText
      .split(/\n(?=\d+[\.\)]\s)/)
      .map(p => p.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(p => p.length > 0)
  }
  // 4. Fallback : double saut de ligne
  else {
    posts = rawText.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0)
  }

  // Filtrer les entrées trop courtes (titres, artefacts)
  return posts
    .filter(p => p.length >= 20)
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
