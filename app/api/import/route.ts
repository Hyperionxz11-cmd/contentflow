import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvsfclqlopzkfmeinbqs.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2c2ZjbHFsb3B6a2ZtZWluYnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3Mjc1NTMsImV4cCI6MjA4OTMwMzU1M30.ka5xQQVdHSslk12iu7vRtWlk9CgpKm5jiDpskeJ1-Bw'
const AI_SPLITTER_URL = `${SUPABASE_URL}/functions/v1/ai-doc-splitter`

// ─────────────────────────────────────────────────────────────
// Quota check helper (import IA uniquement)
// ─────────────────────────────────────────────────────────────
async function checkImportQuota(request: NextRequest): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    })
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return { allowed: true } // pas connecté → on laisse passer (sera bloqué ailleurs)

    const supabase = getSupabaseServer()
    const { data: quota } = await supabase.rpc('check_and_increment_ai_usage', {
      p_user_id: user.id,
      p_action: 'import',
    })
    if (quota && !quota.allowed) {
      return {
        allowed: false,
        response: NextResponse.json({
          error: `Quota imports IA atteint (${quota.current}/${quota.limit} ce mois). Passe au plan supérieur pour continuer.`,
          quota_exceeded: true,
          plan: quota.plan,
        }, { status: 429 }),
      }
    }
  } catch (_) { /* en cas d'erreur inattendue, on laisse passer */ }
  return { allowed: true }
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const LINKEDIN_MAX = 3000
const POST_MIN = 100       // below this = definitely not a full post
const POST_SWEET_MIN = 150 // ideally a LinkedIn post is at least 150 chars
const POST_SWEET_MAX = 2800

// ─────────────────────────────────────────────────────────────
// BLOCK PARSING — the foundation of everything
// Extract every paragraph with its ACTUAL blank-line gap count
// ─────────────────────────────────────────────────────────────

interface Block {
  text: string
  blankLinesAfter: number  // actual number of blank lines after this block
}

function getBlocksAndGaps(rawText: string): Block[] {
  const result: Block[] = []
  let lastIndex = 0
  // Match any sequence of 2+ newlines (possibly with spaces/tabs in between)
  const regex = /\n([ \t]*\n)+/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(rawText)) !== null) {
    const blockText = rawText.slice(lastIndex, match.index).trim()
    // Count actual blank lines = number of \n minus 1
    const blankLines = (match[0].match(/\n/g) || []).length - 1
    if (blockText.length >= POST_MIN) {
      result.push({ text: blockText, blankLinesAfter: blankLines })
    } else if (blockText.length > 0 && result.length > 0) {
      // Tiny block: append to previous block's text instead of dropping it
      result[result.length - 1].text += '\n\n' + blockText
    }
    lastIndex = match.index + match[0].length
  }

  // Last block (no gap after)
  const lastBlock = rawText.slice(lastIndex).trim()
  if (lastBlock.length >= POST_MIN) {
    result.push({ text: lastBlock, blankLinesAfter: 0 })
  } else if (lastBlock.length > 0 && result.length > 0) {
    result[result.length - 1].text += '\n\n' + lastBlock
  }

  return result
}

// ─────────────────────────────────────────────────────────────
// POST SIGNALS — detect post beginnings and endings
// ─────────────────────────────────────────────────────────────

// Returns 0-3: how strongly this block looks like a POST OPENER
function postOpenStrength(text: string): number {
  const first = text.trim().split('\n')[0] || ''
  const t = first.trim()
  let score = 0

  // Starts with emoji (very strong signal)
  if (/^[\u{1F300}-\u{1FAFF}]/u.test(t)) score += 3
  // Starts with known week/post markers
  if (/^(semaine|jour|day|week|post|partie|chapitre|module)\s+\d+/i.test(t)) score += 3
  // Starts with a number followed by a word (e.g. "52 posts", "3 raisons")
  if (/^\d+\s+[a-zA-ZÀ-ÿ]/.test(t)) score += 2
  // Starts with hook patterns: question, strong verbs, pronouns
  if (/^(comment|pourquoi|saviez-|si vous|il y a|chaque|tout |voici|la clé|le secret|stop |c'est |j'ai |vous |on |je )/i.test(t)) score += 2
  // Ends with question mark (short = hook)
  if (t.endsWith('?') && t.length < 120) score += 2
  // Ends with exclamation mark (short = hook)
  if (t.endsWith('!') && t.length < 120) score += 1
  // Dash or em-dash title style (e.g. "Semaine 1 — La LCA")
  if (/[—\-–]\s/.test(t) && t.length < 120) score += 1
  // ALL CAPS (title/header style)
  if (t === t.toUpperCase() && t.length >= 4 && t.length <= 60 && /[A-Z]{3}/.test(t)) score += 2

  return score
}

// Returns 0-3: how strongly this block looks like a POST ENDER
function postEndStrength(text: string): number {
  const trimmed = text.trim()
  const last = trimmed.split('\n').slice(-3).join(' ')
  let score = 0

  // Ends with hashtags (very strong signal)
  if (/#[a-zA-ZÀ-ÿ0-9_]{2,}/.test(last)) score += 3
  // Ends with CTA patterns
  if (/\?[^?]*$/.test(trimmed) && trimmed.length > 100) score += 2
  if (/(commentez?|partagez|likez|dites[- ]moi|dites nous|qu'en pensez|votre avis|rejoignez|suivez|abonnez|contactez|lien en bio)/i.test(last)) score += 2
  // Ends with "…" or "---"
  if (/[…]{1}$/.test(trimmed) || /^-{3,}$/.test(trimmed.split('\n').pop() || '')) score += 1

  return score
}

// ─────────────────────────────────────────────────────────────
// QUALITY SCORING
// ─────────────────────────────────────────────────────────────

function isGoodSplit(posts: string[]): boolean {
  if (posts.length < 2) return false
  if (posts.some(p => p.length > LINKEDIN_MAX + 500)) return false
  const avgLen = posts.reduce((s, p) => s + p.length, 0) / posts.length
  if (avgLen < POST_SWEET_MIN) return false
  const sweetSpot = posts.filter(p => p.length >= POST_SWEET_MIN && p.length <= LINKEDIN_MAX)
  return sweetSpot.length >= Math.max(2, Math.ceil(posts.length * 0.4))
}

function scoreSplit(posts: string[]): number {
  if (!isGoodSplit(posts)) return -1
  const sweetSpot = posts.filter(p => p.length >= POST_SWEET_MIN && p.length <= POST_SWEET_MAX)
  if (sweetSpot.length === 0) return -1
  const lengths = sweetSpot.map(p => p.length)
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((a, b) => a + Math.abs(b - avg), 0) / lengths.length
  const consistencyBonus = Math.max(0, 500 - variance / 8)
  const sweetRatio = sweetSpot.length / posts.length
  // Reward: sweet spot posts + consistency + ratio
  return sweetSpot.length * 100 + consistencyBonus + sweetRatio * 300
}

// ─────────────────────────────────────────────────────────────
// CLEAN A POST BLOCK
// ─────────────────────────────────────────────────────────────

function cleanBlock(s: string): string {
  return s
    .split('\n')
    .filter(line => {
      const t = line.trim()
      if (!t) return true
      // Pure UPPERCASE header (no punctuation, very short)
      if (t.length >= 3 && t.length <= 60 && t === t.toUpperCase()
          && /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]{3}/.test(t) && !/[.?!,;:]/.test(t)
          && !/[#@]/.test(t)) return false
      // Lone week/chapter markers (no content after them)
      if (/^(semaine|jour|day|week|chapitre|partie|section|module)\s+\d+\s*[:\-—]?\s*$/i.test(t)) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─────────────────────────────────────────────────────────────
// STRATEGY 0 — MARKDOWN HEADINGS (## / ### sent by BulkImport)
// When BulkImport sends htmlToStructuredText, headings become ## markers
// These are the most reliable signal we can get from a Word doc
// ─────────────────────────────────────────────────────────────

function markdownHeadingSplit(text: string): string[] | null {
  // Match ## or ### headings at the start of a line
  if (!/^#{1,4}\s+\S/m.test(text)) return null
  const headingCount = (text.match(/^#{1,4}\s+\S/gm) || []).length
  if (headingCount < 2) return null

  // Split on heading markers, keeping the heading as first line of each post
  const parts = text.split(/\n(?=#{1,4}\s+)/)
  const posts = parts
    .map(p => {
      // Strip the ## prefix from the first line (it's decoration, not content)
      return p.replace(/^#{1,4}\s+/, '').trim()
    })
    .filter(p => p.length >= POST_MIN)

  if (posts.length < 2) return null
  return mergeShortPosts(posts)
}

// ─────────────────────────────────────────────────────────────
// STRATEGY 1 — EXPLICIT SEPARATORS (---, ===, ***, ___  etc.)
// ─────────────────────────────────────────────────────────────

function explicitSepSplit(text: string): string[] | null {
  const seps = [
    /^[-]{3,}$/m,
    /^[=]{3,}$/m,
    /^[*]{3,}$/m,
    /^[_]{3,}$/m,
    /^[#]{3,}$/m,
    /^[~]{3,}$/m,
  ]
  for (const sep of seps) {
    if (sep.test(text)) {
      const parts = text.split(sep).map(s => cleanBlock(s)).filter(s => s.length >= POST_MIN)
      if (parts.length >= 2) return parts
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// STRATEGY 2 — NUMBERED / LABELED MARKERS
// Post 1:, Post 2:, Semaine 1, 1., etc.
// ─────────────────────────────────────────────────────────────

function labeledMarkerSplit(text: string): string[] | null {
  const patterns = [
    // "Post N" or "Post N:"
    { re: /^post\s*\d+[\s:.\-—]/im, split: /\n(?=post\s*\d+[\s:.\-—])/i, strip: /^post\s*\d+[\s:.\-—]*/i },
    // "Semaine N" / "Jour N" / "Day N" / "Week N" — any number of blank lines before marker
    { re: /^(semaine|jour|day|week)\s+\d+/im, split: /\n+(?=(semaine|jour|day|week)\s+\d+)/i, strip: null },
    // "1." or "1)" at start of line (at least 3 occurrences)
    { re: /^\d+[\.\)]\s/m, split: /\n(?=\d+[\.\)]\s)/, strip: /^\d+[\.\)]\s*/ },
  ]

  for (const p of patterns) {
    if (p.re.test(text)) {
      const count = (text.match(new RegExp(p.re.source, 'gim')) || []).length
      if (count < 2) continue
      const parts = text.split(p.split)
        .map(s => p.strip ? s.replace(p.strip, '') : s)
        .map(s => cleanBlock(s))
        .filter(s => s.length >= POST_MIN)
      if (parts.length >= 2) return parts
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// STRATEGY 3 — GAP THRESHOLD (MAIN ALGORITHM)
// Detect the right blank-line threshold automatically
// ─────────────────────────────────────────────────────────────

function gapThresholdSplit(blocks: Block[], threshold: number): string[] {
  // Merge consecutive blocks where gap < threshold into posts
  const posts: string[] = []
  let current = ''

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    current = current ? current + '\n\n' + block.text : block.text

    // Split here if gap >= threshold, or last block
    if (block.blankLinesAfter >= threshold || i === blocks.length - 1) {
      const cleaned = cleanBlock(current)
      if (cleaned.length >= POST_MIN) posts.push(cleaned)
      current = ''
    }
  }

  return posts
}

// Try all reasonable thresholds (1-4), return best
function adaptiveGapSplit(blocks: Block[]): string[] | null {
  if (blocks.length < 2) return null

  // Collect gap sizes to understand the document's structure
  const gapSizes = blocks.map(b => b.blankLinesAfter).filter(g => g > 0)
  const maxGap = Math.max(...gapSizes, 0)

  // Try thresholds from largest to smallest
  const candidates: string[][] = []

  for (let threshold = Math.min(maxGap, 4); threshold >= 1; threshold--) {
    const hasGapsAtThreshold = gapSizes.filter(g => g >= threshold).length >= 2
    if (!hasGapsAtThreshold && threshold > 1) continue

    const posts = gapThresholdSplit(blocks, threshold)
    // Then merge very short consecutive posts
    const merged = mergeShortPosts(posts)
    if (merged.length >= 2) candidates.push(merged)
  }

  if (candidates.length === 0) return null

  // Return the best-scoring candidate
  const scored = candidates
    .map(posts => ({ posts, score: scoreSplit(posts) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.length > 0 ? scored[0].posts : null
}

// ─────────────────────────────────────────────────────────────
// STRATEGY 4 — SIGNAL-BASED SPLITTING
// Use post-open/post-end signals to find boundaries
// ─────────────────────────────────────────────────────────────

function signalBasedSplit(blocks: Block[]): string[] | null {
  if (blocks.length < 3) return null

  // Score each potential boundary
  interface Boundary { index: number; score: number }
  const boundaries: Boundary[] = []

  for (let i = 0; i < blocks.length - 1; i++) {
    const endScore = postEndStrength(blocks[i].text)
    const openScore = postOpenStrength(blocks[i + 1].text)
    const gapScore = Math.min(blocks[i].blankLinesAfter, 3)
    const total = endScore + openScore + gapScore
    boundaries.push({ index: i, score: total })
  }

  // A boundary is "real" if score >= 2 (at least some signal)
  const cutPoints = new Set<number>()
  const avgScore = boundaries.reduce((s, b) => s + b.score, 0) / boundaries.length
  const scoreThreshold = Math.max(2, avgScore * 0.7)

  for (const b of boundaries) {
    if (b.score >= scoreThreshold) cutPoints.add(b.index)
  }

  if (cutPoints.size < 1) return null

  // Build posts by cutting at those boundaries
  const posts: string[] = []
  let currentBlocks: Block[] = []

  for (let i = 0; i < blocks.length; i++) {
    currentBlocks.push(blocks[i])
    if (cutPoints.has(i) || i === blocks.length - 1) {
      const text = cleanBlock(currentBlocks.map(b => b.text).join('\n\n'))
      if (text.length >= POST_MIN) posts.push(text)
      currentBlocks = []
    }
  }

  const merged = mergeShortPosts(posts)
  return merged.length >= 2 ? merged : null
}

// ─────────────────────────────────────────────────────────────
// MERGE SHORT POSTS
// After splitting, merge adjacent posts that are too short
// ─────────────────────────────────────────────────────────────

function mergeShortPosts(posts: string[]): string[] {
  if (posts.length === 0) return []
  const result: string[] = []
  let acc = ''

  for (let i = 0; i < posts.length; i++) {
    acc = acc ? acc + '\n\n' + posts[i] : posts[i]

    const isLast = i === posts.length - 1
    const nextIsAlsoShort = !isLast && posts[i + 1].length < POST_SWEET_MIN
    const currentIsLong = acc.length >= POST_SWEET_MIN

    if (currentIsLong || isLast || (!nextIsAlsoShort && acc.length >= POST_MIN)) {
      result.push(acc)
      acc = ''
    }
  }

  if (acc) result.push(acc)
  return result
}

// ─────────────────────────────────────────────────────────────
// MASTER RULE-BASED SPLITTER
// ─────────────────────────────────────────────────────────────

function ruleSplit(rawText: string): string[] | null {
  const text = rawText.trim()
  const candidates: string[][] = []

  const addCandidate = (parts: string[] | null) => {
    if (!parts) return
    const cleaned = parts.map(cleanBlock).filter(p => p.length >= POST_MIN)
    if (cleaned.length >= 2) candidates.push(cleaned)
  }

  // ── 0. Markdown headings (## / ###) — from htmlToStructuredText ──
  const mdHeadings = markdownHeadingSplit(text)
  if (mdHeadings && mdHeadings.length >= 2 && isGoodSplit(mdHeadings)) return mdHeadings

  // ── 1. Explicit separators (---, ===, etc.) — instant win ──
  const explicitResult = explicitSepSplit(text)
  if (explicitResult && explicitResult.length >= 2) {
    // High confidence: use directly if quality is OK
    const merged = mergeShortPosts(explicitResult)
    if (isGoodSplit(merged)) return merged
    addCandidate(explicitResult)
  }

  // ── 2. Labeled markers (Post N, Semaine N, 1.) ──
  addCandidate(labeledMarkerSplit(text))

  // ── 3. Block parsing — foundation for strategies 3 & 4 ──
  const blocks = getBlocksAndGaps(text)

  // ── 3. Adaptive gap threshold ──
  const gapResult = adaptiveGapSplit(blocks)
  addCandidate(gapResult)

  // ── 4. Signal-based (hook/hashtag detection) ──
  addCandidate(signalBasedSplit(blocks))

  // ── 5. Fallback: try all single-line blocks (one post per line) ──
  const lineBlocks = text.split('\n').map(l => l.trim()).filter(l => l.length >= POST_SWEET_MIN)
  if (lineBlocks.length >= 3) addCandidate(lineBlocks)

  if (candidates.length === 0) return null

  // Score all candidates, return best
  const scored = candidates
    .map(posts => ({ posts, score: scoreSplit(posts) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    // No good split found — return best available even if not perfect
    const fallback = candidates
      .map(posts => ({ posts, score: posts.length }))
      .sort((a, b) => b.score - a.score)
    return fallback.length > 0 ? fallback[0].posts.slice(0, 500) : null
  }

  return scored[0].posts.slice(0, 500)
}

// ─────────────────────────────────────────────────────────────
// AI SPLIT — chunked for documents of any length
// ─────────────────────────────────────────────────────────────

async function aiSplit(text: string): Promise<{ posts: string[]; structure: string }> {
  const CHUNK_SIZE = 4000
  const OVERLAP = 150

  if (text.length <= CHUNK_SIZE) {
    return aiSplitChunk(text)
  }

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
// MAIN ROUTE
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
      const ext = filename.toLowerCase().split('.').pop() || ''
      if (['docx', 'doc', 'pdf'].includes(ext)) {
        return NextResponse.json({
          error: `Le format .${ext} doit être traité côté client (via l'interface). Envoie le texte extrait en JSON.`,
        }, { status: 400 })
      }
      rawText = await file.text()
    } else {
      return NextResponse.json({ error: 'Content-Type non supporté.' }, { status: 400 })
    }

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json({ error: 'Fichier vide ou illisible.' }, { status: 400 })
    }

    // ── Step 1: Rule-based (unless forceAI) ──
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

    // ── Step 2: AI chunked split (avec vérification quota) ──
    const quotaCheck = await checkImportQuota(request)
    if (!quotaCheck.allowed) return quotaCheck.response!
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
      // AI failed (no credits or network error) — partial fallback
      const fallback = ruleSplit(rawText) || rawText
        .split(/\n{2,}/)
        .map(cleanBlock)
        .filter(p => p.length >= POST_MIN)
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
