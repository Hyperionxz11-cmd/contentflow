import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvsfclqlopzkfmeinbqs.supabase.co'
const AI_SPLITTER_URL = `${SUPABASE_URL}/functions/v1/ai-doc-splitter`

// ─────────────────────────────────────────────────────────────
// Quality validation
// A LinkedIn post is typically 200-3000 chars.
// Any "post" > 4000 chars means the split failed for that piece.
// ─────────────────────────────────────────────────────────────
const LINKEDIN_MAX = 4000
const MIN_POST_LEN = 80   // raised from 40 — anything shorter is a title/header, not a post
const SWEET_MIN = 200     // LinkedIn posts are rarely < 200 chars
const SWEET_MAX = 2800

function isGoodSplit(posts: string[]): boolean {
  if (posts.length < 2) return false
  // Hard fail: any post way too long = the whole document landed in one block
  if (posts.some(p => p.length > LINKEDIN_MAX)) return false
  // Average post must be >= 150 chars — if shorter, we're over-splitting paragraphs
  const avgLen = posts.reduce((sum, p) => sum + p.length, 0) / posts.length
  if (avgLen < 150) return false
  // At least 50% of posts must be of reasonable length
  const reasonable = posts.filter(p => p.length >= MIN_POST_LEN && p.length <= LINKEDIN_MAX)
  return reasonable.length >= Math.max(2, Math.ceil(posts.length * 0.5))
}

// Score a split result: higher = better
// Reward posts in the LinkedIn sweet spot (200-2800 chars), penalize extremes
function scoreSplit(posts: string[]): number {
  if (!isGoodSplit(posts)) return -1
  // Primary score: posts in the LinkedIn sweet spot
  const sweetSpot = posts.filter(p => p.length >= SWEET_MIN && p.length <= SWEET_MAX)
  if (sweetSpot.length === 0) return -1
  // Consistency bonus: lower variance = better
  const lengths = sweetSpot.map(p => p.length)
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((a, b) => a + Math.abs(b - avg), 0) / lengths.length
  const consistencyBonus = Math.max(0, 500 - variance / 10)
  // Penalize total post count vs sweet-spot count (over-splitting penalty)
  const sweetRatio = sweetSpot.length / posts.length
  return sweetSpot.length * 100 + consistencyBonus + sweetRatio * 200
}

// ─────────────────────────────────────────────────────────────
// Clean a post block: strip pure section headers, normalize whitespace
// ─────────────────────────────────────────────────────────────
function cleanBlock(s: string): string {
  return s
    .split('\n')
    .filter(line => {
      const t = line.trim()
      if (!t) return true
      // Pure UPPERCASE section header (no punctuation, short)
      if (t.length >= 3 && t.length <= 80 && t === t.toUpperCase()
          && /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]{3}/.test(t) && !/[.?!,;:]/.test(t)) return false
      // Week/day/chapter markers
      if (/^(semaine|jour|day|week|chapitre|partie|section|module|post)\s+\d+\s*[:\-—]?\s*$/i.test(t)) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─────────────────────────────────────────────────────────────
// Multi-strategy rule-based splitter
// Tries every possible strategy, picks the best-scoring result
// ─────────────────────────────────────────────────────────────
function ruleSplit(rawText: string): string[] | null {
  const text = rawText.trim()
  const candidates: string[][] = []

  const addCandidate = (parts: string[]) => {
    const cleaned = parts.map(cleanBlock).filter(p => p.length >= MIN_POST_LEN)
    if (cleaned.length >= 2) candidates.push(cleaned)
  }

  // 1. Explicit --- separator
  if (/^-{3,}$/m.test(text)) {
    addCandidate(text.split(/^-{3,}$/m))
  }

  // 2. Explicit === separator
  if (/^={3,}$/m.test(text)) {
    addCandidate(text.split(/^={3,}$/m))
  }

  // 3. "Post N:" or "Post N —" markers
  if (/^post\s*\d+[\s:.\-—]/im.test(text)) {
    addCandidate(
      text.split(/\n(?=post\s*\d+[\s:.\-—])/i)
        .map(p => p.replace(/^post\s*\d+[\s:.\-—]*/i, ''))
    )
  }

  // 4. Numbered list "1." or "1)"
  const numberedCount = (text.match(/^(\d+)[\.\)]\s/gm) || []).length
  if (numberedCount >= 3) {
    addCandidate(
      text.split(/\n(?=\d+[\.\)]\s)/)
        .map(p => p.replace(/^\d+[\.\)]\s*/, ''))
    )
  }

  // 5. "Semaine X" / "Jour X" / "Day X"
  if (/^(semaine|jour|day|week)\s+\d+/im.test(text)) {
    addCandidate(text.split(/\n{1,3}(?=(semaine|jour|day|week)\s+\d+)/i))
  }

  // 6. UPPERCASE section headers (2+ newlines before the header)
  if (/\n{2,}[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ][A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ\s]{3,}\n/.test(text)) {
    addCandidate(text.split(/\n{2,}(?=[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ][A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ\s]{3,}\n)/))
  }

  // 7. Triple newlines
  if (text.includes('\n\n\n')) {
    addCandidate(text.split(/\n{3,}/))
  }

  // 8. Double newlines — with aggressive title merging
  {
    const raw = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length >= MIN_POST_LEN)
    if (raw.length >= 2) {
      // Try without merging
      addCandidate(raw)
      // Try with title merging (short single-line blocks merged into the next)
      const merged: string[] = []
      let i = 0
      while (i < raw.length) {
        let block = raw[i]
        // Keep merging short blocks into a growing post
        while (
          i + 1 < raw.length &&
          (block.length < SWEET_MIN || raw[i + 1].length < SWEET_MIN) &&
          block.length + raw[i + 1].length < SWEET_MAX
        ) {
          i++
          block += '\n\n' + raw[i]
        }
        merged.push(block)
        i++
      }
      if (merged.length !== raw.length && merged.length >= 2) addCandidate(merged)
    }
  }

  // 9. Single newlines — each line is a post (very dense flat format, only if lines are long)
  {
    const lines = text.split('\n').map(p => p.trim()).filter(p => p.length >= SWEET_MIN)
    if (lines.length >= 3) addCandidate(lines)
  }

  // 10. Mixed: split on any blank line, then merge short adjacent blocks aggressively
  {
    const parts = text.split(/\n\s*\n/).map(cleanBlock).filter(p => p.length >= MIN_POST_LEN)
    if (parts.length >= 2) {
      const merged: string[] = []
      let i = 0
      while (i < parts.length) {
        let block = parts[i]
        // Keep merging consecutive short blocks until post reaches minimum LinkedIn length
        while (i + 1 < parts.length && block.length < SWEET_MIN) {
          i++
          block += '\n\n' + parts[i]
        }
        merged.push(block)
        i++
      }
      if (merged.length >= 2) addCandidate(merged)
    }
  }

  if (candidates.length === 0) return null

  // Score all candidates, return best
  const scored = candidates
    .map(posts => ({ posts, score: scoreSplit(posts) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null
  return scored[0].posts.slice(0, 500)
}

// ─────────────────────────────────────────────────────────────
// AI split — chunked for documents of any length
// ─────────────────────────────────────────────────────────────
async function aiSplit(text: string): Promise<{ posts: string[]; structure: string }> {
  const CHUNK_SIZE = 4000
  const OVERLAP = 150

  if (text.length <= CHUNK_SIZE) {
    return aiSplitChunk(text)
  }

  // Build chunks at paragraph boundaries
  const chunks: string[] = []
  let pos = 0
  while (pos < text.length) {
    let end = Math.min(pos + CHUNK_SIZE, text.length)
    if (end < text.length) {
      const lastBreak = text.lastIndexOf('\n\n', end)
      if (lastBreak > pos + CHUNK_SIZE / 2) end = lastBreak
    }
    chunks.push(text.slice(pos, end))
    pos = end - OVERLAP
    if (pos >= text.length) break
  }

  const results = await Promise.all(
    chunks.map(chunk => aiSplitChunk(chunk).catch(() => ({ posts: [] as string[], structure: 'unknown' })))
  )

  // Merge, dedup at chunk boundaries
  const allPosts: string[] = []
  for (const r of results) {
    for (const post of r.posts) {
      const last = allPosts[allPosts.length - 1] || ''
      if (post.slice(0, 60) !== last.slice(0, 60)) allPosts.push(post)
    }
  }

  return { posts: allPosts, structure: `ai-chunked(${chunks.length})` }
}

async function aiSplitChunk(text: string): Promise<{ posts: string[]; structure: string }> {
  const res = await fetch(AI_SPLITTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`AI splitter HTTP ${res.status}`)
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
    let forceAI = false

    if (contentType.includes('application/json')) {
      const body = await request.json()
      rawText = body.text || ''
      filename = body.filename || 'import'
      forceAI = body.forceAI === true
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

    // ── Step 1: Multi-strategy rule-based (skipped if forceAI) ──
    if (!forceAI) {
      const rulePosts = ruleSplit(rawText)
      if (rulePosts && rulePosts.length >= 2) {
        return NextResponse.json({
          posts: rulePosts,
          count: rulePosts.length,
          filename,
          method: 'rule-based',
          structure: 'detected',
          warning: null,
        })
      }
    }

    // ── Step 2: AI chunked split ──
    try {
      const { posts, structure } = await aiSplit(rawText)
      if (posts.length >= 1) {
        return NextResponse.json({
          posts: posts.slice(0, 500),
          count: Math.min(posts.length, 500),
          filename,
          method: 'ai',
          structure,
          warning: null,
        })
      }
    } catch (aiErr: any) {
      // AI failed (no credits or network error)
      // Return what we have from rule-based (even if quality is bad)
      // with a clear warning
      const fallback = rawText
        .split(/\n{2,}/)
        .map(cleanBlock)
        .filter(p => p.length >= MIN_POST_LEN)
        .slice(0, 500)

      if (fallback.length >= 1) {
        return NextResponse.json({
          posts: fallback,
          count: fallback.length,
          filename,
          method: 'partial',
          structure: 'unknown',
          warning: 'ai_unavailable',
        })
      }

      return NextResponse.json({
        error: 'Détection automatique indisponible (crédits IA épuisés). Formate ton document avec --- entre les posts.',
        warning: 'ai_unavailable',
      }, { status: 422 })
    }

    return NextResponse.json({
      error: 'Aucun post détecté. Sépare tes posts avec --- pour garantir la détection.',
    }, { status: 400 })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
