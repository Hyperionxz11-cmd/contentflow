import { NextRequest, NextResponse } from 'next/server'

// Extraction DOCX sans dépendance externe (DOCX = ZIP + XML)
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    // Essayer mammoth en premier
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    if (result.value && result.value.length > 0) return result.value
  } catch (e) {
    console.warn('Mammoth failed, using XML fallback:', e)
  }

  // Fallback : parser le XML directement depuis le ZIP
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(buffer)
    const xmlFile = zip.file('word/document.xml')
    if (!xmlFile) throw new Error('Fichier document.xml non trouvé dans le DOCX')

    const xml = await xmlFile.async('text')
    // Extraire le texte des balises <w:t> et <w:p>
    const text = xml
      .replace(/<\/w:p>/g, '\n')       // Paragraphes → retour ligne
      .replace(/<\/w:r>/g, ' ')        // Runs → espace
      .replace(/<[^>]+>/g, '')          // Supprimer tous les tags XML
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
    return text
  } catch (e2) {
    throw new Error(`Impossible de lire le fichier DOCX : ${(e2 as Error).message}`)
  }
}

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
  // Forcer JSON en réponse dans tous les cas
  const headers = { 'Content-Type': 'application/json' }

  try {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: `Erreur de lecture du fichier : ${e.message}. Le fichier est peut-être trop volumineux (max 10 Mo).` }),
        { status: 400, headers }
      )
    }

    const file = formData.get('file') as File | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'Aucun fichier fourni' }), { status: 400, headers })
    }

    // Vérifier la taille (max 10 Mo)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 10 Mo.` }),
        { status: 413, headers }
      )
    }

    let rawText = ''
    const ext = file.name.toLowerCase()

    if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
      const buffer = Buffer.from(await file.arrayBuffer())
      rawText = await extractTextFromDocx(buffer)
    } else if (ext.endsWith('.txt') || ext.endsWith('.csv') || ext.endsWith('.md')) {
      rawText = await file.text()
    } else {
      return new Response(
        JSON.stringify({ error: 'Format non supporté. Utilisez .docx, .txt ou .md' }),
        { status: 400, headers }
      )
    }

    if (!rawText || rawText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Le fichier semble vide ou illisible. Vérifiez son contenu.' }),
        { status: 400, headers }
      )
    }

    const posts = splitIntoPosts(rawText)

    if (posts.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Aucun post détecté. Sépare tes posts avec --- ou laisse une ligne vide entre chacun.',
          rawPreview: rawText.slice(0, 300)
        }),
        { status: 400, headers }
      )
    }

    return new Response(
      JSON.stringify({ posts, count: posts.length, filename: file.name }),
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
