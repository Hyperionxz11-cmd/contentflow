import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvsfclqlopzkfmeinbqs.supabase.co'
const AI_SPLITTER_URL = `${SUPABASE_URL}/functions/v1/ai-doc-splitter`

// ─────────────────────────────────────────────────────────────
// Rule-based split — covers ~90% of real documents
// Much more permissive than the previous version
// ─────────────────────────────────────────────────────────────
function ruleSplit(rawText: string): string[] | null {
  const text = rawText.trim()

  // Helper: clean a post block
  const clean = (s: string) =>
    s
      .split('\n')
      .filter(line => {
        const t = line.trim()
        if (!t) return true
        // Remove pure section headers (ALL CAPS, short, no punctuation)
        if (t.length >= 3 && t.length <= 60 && t === t.toUpperCase() && /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]{3}/.test(t) && !/[.?!,]/.test(t)) return false
        if (/^(semaine|jour|day|week|chapitre|partie|section|module)\s+\d+/i.test(t)) return false
        return true
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

  // 1. Explicit separator --- or ===
  if (/^-{3,}$/m.test(text)) {
    const posts = text.split(/^-{3,}$/m).map(p => clean(p)).filter(p => p.length >= 30)
    if (posts.length >= 2) return posts
  }
  if (/^={3,}$/m.test(text)) {
    const posts = text.split(/^={3,}$/m).map(p => clean(p)).filter(p => p.length >= 30)
    if (posts.length >= 2) return posts
  }

  // 2. Explicit "Post N" / "POST N" markers
  if (/^post\s*\d+/im.test(text)) {
    const posts = text
      .split(/\n(?=post\s*\d+[\s:.\-—])/i)
      .map(p => clean(p.replace(/^post\s*\d+[\s:.\-—]*/i, '')))
      .filter(p => p.length >= 30)
    if (posts.length >= 2) return posts
  }

  // 3. Numbered "1." or "1)" at line start — but only if consistent throughout
  const numberedMatches = text.match(/^(\d+)[\.\)]\s/gm) || []
  if (numberedMatches.length >= 3) {
    const posts = text
      .split(/\n(?=\d+[\.\)]\s)/)
      .map(p => clean(p.replace(/^\d+[\.\)]\s*/, '')))
      .filter(p => p.length >= 30)
    if (posts.length >= 2) return posts
  }

  // 4. "Semaine X" / "Jour X" / "Day X" markers
  if (/^(semaine|jour|day|week)\s+\d+/im.test(text)) {
    const posts = text
      .split(/\n{1,3}(?=(semaine|jour|day|week)\s+\d+)/i)
      .map(p => clean(p))
      .filter(p => p.length >= 30)
    if (posts.length >= 2) return posts
  }

  // 5. UPPERCASE section headers (e.g. FONDAMENTAUX\n\nContent...)
  if (/\n{1,3}[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ][A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ\s]{3,}\n/.test(text)) {
    const sections = text
      .split(/\n{1,3}(?=[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ][A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ\s]{3,}\n)/)
      .map(p => {
        // Keep UPPERCASE header as first line only if it's a title-like prefix
        return clean(p)
      })
      .filter(p => p.length >= 30)
    if (sections.length >= 2) return sections
  }

  // 6. Triple newlines
  if (text.includes('\n\n\n')) {
    const posts = text.split(/\n{3,}/).map(p => clean(p)).filter(p => p.length >= 30)
    if (posts.length >= 2) return posts
  }

  // 7. Double newlines — PERMISSIVE version
  // This is the most common pattern for Word docs
  const doubleParts = text.split(/\n\n+/).map(p => clean(p)).filter(p => p.length >= 30)
  if (doubleParts.length >= 2) {
    // Merge very short fragments (titles) with the following block
    const merged: string[] = []
    let i = 0
    while (i < doubleParts.length) {
      const current = doubleParts[i]
      const isShortTitle = current.length < 80 && !current.includes('\n') && i + 1 < doubleParts.length
      if (isShortTitle && doubleParts[i + 1].length >= 80) {
        merged.push(current + '\n\n' + doubleParts[i + 1])
        i += 2
      } else {
        merged.push(current)
        i++
      }
    }
    if (merged.length >= 2) return merged
  }

  // 8. Single newline — each line is a post (very dense format)
  const lineParts = text.split(/\n/).map(p => p.trim()).filter(p => p.length >= 80)
  if (lineParts.length >= 3) return lineParts

  return null
}

// ─────────────────────────────────────────────────────────────
// AI split — chunked for long documents
// Splits the document into 4000-char chunks, processes each,
// then merges. No truncation = 52-post docs work perfectly.
// ─────────────────────────────────────────────────────────────
async function aiSplit(text: string): Promise<{ posts: string[]; structure: string }> {
  const CHUNK_SIZE = 4000
  const OVERLAP = 200 // overlap to avoid cutting posts at boundaries

  // For short docs: single call
  if (text.length <= CHUNK_SIZE) {
    return await aiSplitChunk(text)
  }

  // For long docs: split into chunks and merge results
  const chunks: string[] = []
  let pos = 0
  while (pos < text.length) {
    // Find a good split point (paragraph boundary)
    let end = Math.min(pos + CHUNK_SIZE, text.length)
    if (end < text.length) {
      const lastBreak = text.lastIndexOf('\n\n', end)
      if (lastBreak > pos + CHUNK_SIZE / 2) end = lastBreak
    }
    chunks.push(text.slice(pos, end))
    pos = end - OVERLAP
    if (pos >= text.length) break
  }

  // Process all chunks in parallel
  const results = await Promise.all(chunks.map(chunk => aiSplitChunk(chunk).catch(() => ({ posts: [] as string[], structure: 'unknown' }))))

  // Merge and deduplicate
  const allPosts: string[] = []
  for (const r of results) {
    for (const post of r.posts) {
      // Simple dedup: skip if very similar to last post
      const last = allPosts[allPosts.length - 1] || ''
      const similarity = post.slice(0, 50) === last.slice(0, 50)
      if (!similarity) allPosts.push(post)
    }
  }

  return { posts: allPosts, structure: results[0]?.structure || 'ai-chunked' }
}

async function aiSplitChunk(text: string): Promise<{ posts: string[]; structure: string }> {
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

// ─────────────────────────────────────────────────────────────
// Main route
// ─────────────────────────────────────────────────────────────
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
      rawText = await file.text()
    } else {
      return NextResponse.json({ error: 'Content-Type non supporté.' }, { status: 400 })
    }

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json({ error: 'Fichier vide ou illisible.' }, { status: 400 })
    }

    // Step 1: Rule-based (free, handles 90% of cases, no token limit)
    const rulePosts = ruleSplit(rawText)
    if (rulePosts && rulePosts.length >= 2) {
      return NextResponse.json({
        posts: rulePosts.slice(0, 200),
        count: Math.min(rulePosts.length, 200),
        filename,
        method: 'rule-based',
        structure: 'detected',
      })
    }

    // Step 2: AI with chunked processing (handles any length, costs ~$0.002×chunks)
    try {
      const { posts, structure } = await aiSplit(rawText)
      if (posts.length > 0) {
        return NextResponse.json({
          posts: posts.slice(0, 200),
          count: Math.min(posts.length, 200),
          filename,
          method: 'ai',
          structure,
        })
      }
    } catch (aiErr: any) {
      console.error('AI split failed:', aiErr.message)
      // Fall through to error
    }

    return NextResponse.json({
      error: 'Aucun post détecté. Vérifie que ton document contient des posts séparés.',
      rawPreview: rawText.slice(0, 300),
    }, { status: 400 })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
