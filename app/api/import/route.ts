import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvsfclqlopzkfmeinbqs.supabase.co'
const AI_SPLITTER_URL = `${SUPABASE_URL}/functions/v1/ai-doc-splitter`

// ─────────────────────────────────────────────────────────────
// Rule-based split — covers 80%+ of real-world documents
// Returns null if the document structure is too ambiguous
// (Only then do we call the AI, saving ~$0.002 per doc)
// ─────────────────────────────────────────────────────────────
function ruleSplit(rawText: string): string[] | null {
  const text = rawText.trim()

  // 1. Explicit separators --- or ===
  if (/^-{3,}$/m.test(text)) {
    const posts = text.split(/^-{3,}$/m).map(p => p.trim()).filter(p => p.length >= 80)
    if (posts.length >= 2) return posts
  }
  if (/^={3,}$/m.test(text)) {
    const posts = text.split(/^={3,}$/m).map(p => p.trim()).filter(p => p.length >= 80)
    if (posts.length >= 2) return posts
  }

  // 2. Numbered posts: "Post 1:", "Post 1 —", "1.", "1)"
  if (/^(post\s*\d+[\s:—]|\d+[\.\)]\s)/im.test(text)) {
    const posts = text
      .split(/\n(?=post\s*\d+[\s:—]|\d+[\.\)]\s)/i)
      .map(p => p.replace(/^(post\s*\d+[\s:—\s]|\d+[\.\)]\s*)/i, '').trim())
      .filter(p => p.length >= 80)
    if (posts.length >= 2) return posts
  }

  // 3. UPPERCASE section headers (like "FONDAMENTAUX\n\nPost content")
  // Pattern: 2+ blank lines → UPPERCASE line (4+ chars) → content
  if (/\n{2,}[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ\s]{4,}\n/.test(text)) {
    const sections = text
      .split(/\n{2,}(?=[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ][A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ\s]{3,}\n)/)
      .map(p => p.trim())
      .filter(p => {
        if (p.length < 80) return false
        const first = p.split('\n')[0].trim()
        return first.length >= 4 && first === first.toUpperCase() && /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]/.test(first)
      })
    if (sections.length >= 2) return sections
  }

  // 4. "Semaine X" / "Jour X" / "Day X" section markers
  if (/^(semaine|jour|day|week)\s+\d+/im.test(text)) {
    const posts = text
      .split(/\n{2,}(?=(semaine|jour|day|week)\s+\d+)/i)
      .map(p => p.trim())
      .filter(p => p.length >= 80)
    if (posts.length >= 2) return posts
  }

  // 5. Triple newlines (clear paragraph breaks)
  if (text.includes('\n\n\n')) {
    const posts = text.split(/\n{3,}/).map(p => p.trim()).filter(p => p.length >= 80)
    if (posts.length >= 2) return posts
  }

  // 6. Double newlines — only if content looks like multiple distinct posts
  // (avoids splitting a single long post with paragraph breaks)
  const doubleBreakParts = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length >= 80)
  if (doubleBreakParts.length >= 3 && doubleBreakParts.length <= 50) {
    // Heuristic: if average length > 200 chars and each part looks like a post
    const avgLen = doubleBreakParts.reduce((s, p) => s + p.length, 0) / doubleBreakParts.length
    if (avgLen >= 200) return doubleBreakParts
  }

  return null  // Unclear structure → will use AI
}

// ─────────────────────────────────────────────────────────────
// AI-powered split (only called when rule-based fails)
// Cost: ~$0.002 per call with claude-haiku (5000 chars input)
// ─────────────────────────────────────────────────────────────
async function aiSplit(text: string): Promise<{ posts: string[]; structure: string }> {
  const res = await fetch(AI_SPLITTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI splitter: ${err}`)
  }
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return { posts: data.posts || [], structure: data.structure || 'ai' }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let rawText = ''
    let filename = 'import'

    if (contentType.includes('application/json')) {
      const body = await request.json()
      rawText = body.text || ''
      filename = body.filename || 'import'
    } else if (contentType.includes('multipart/form-data')) {
      let formData: FormData
      try { formData = await request.formData() } catch (e: any) {
        return NextResponse.json({ error: `Lecture erreur : ${e.message}` }, { status: 400 })
      }
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
      filename = file.name
      if (file.name.toLowerCase().match(/\.(txt|md|csv|rtf)$/)) {
        rawText = await file.text()
      } else {
        return NextResponse.json({ error: 'Glisse-dépose le fichier directement.' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Content-Type non supporté.' }, { status: 400 })
    }

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json({ error: 'Fichier vide ou illisible.' }, { status: 400 })
    }

    // ── Step 1: Try fast rule-based split (free, instant) ──
    const rulePosts = ruleSplit(rawText)
    if (rulePosts && rulePosts.length >= 2) {
      return NextResponse.json({
        posts: rulePosts.slice(0, 100),
        count: Math.min(rulePosts.length, 100),
        filename,
        method: 'rule-based',
        structure: 'detected',
      })
    }

    // ── Step 2: AI split as fallback (costs ~$0.002 per call) ──
    const { posts, structure } = await aiSplit(rawText)

    if (posts.length === 0) {
      return NextResponse.json({
        error: 'Aucun post détecté dans ce document.',
        rawPreview: rawText.slice(0, 300),
      }, { status: 400 })
    }

    return NextResponse.json({
      posts: posts.slice(0, 100),
      count: Math.min(posts.length, 100),
      filename,
      method: 'ai',
      structure,
    })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
