'use client'

import { useState } from 'react'
import {
  Upload, FileText, Calendar, Check, X, Loader2,
  Pencil, Image as ImageIcon, Sparkles, Clock, AlertCircle,
  Hash, MessageCircle, Zap, ChevronDown, ChevronUp, Star
} from 'lucide-react'
import LinkedInPreview from '@/components/linkedin/LinkedInPreview'

interface BulkImportProps {
  onImport: (posts: { content: string; scheduledAt: string; status: string; images?: string[] }[]) => Promise<void> | void
  onClose: () => void
  isPremium?: boolean
  plan?: string
  publishedPosts?: Array<{ scheduled_at: string; status: string }>
  authorAvatar?: string
  authorName?: string
}

interface AIVariant {
  format: string
  description: string
  content: string
}

interface SmartSlot {
  hour: number
  day: number
  dayLabel: string
  score: number
  label: string
}

// ─────────────────────────────────────────────────────────────
// Element detection
// ─────────────────────────────────────────────────────────────

interface PostElements { hook: boolean; hashtags: boolean; cta: boolean }

function detectElements(text: string): PostElements {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const firstLine = lines[0] || ''
  const lastThree = lines.slice(-4).join(' ')
  const hook =
    firstLine.length >= 15 &&
    (firstLine.endsWith('?') || firstLine.endsWith('!') || firstLine.length >= 45 ||
      /^(j'|je |vous |on |comment |pourquoi |saviez-|si vous|il y a|chaque|tout |voici|la clé|le secret|stop |\d+\s)/i.test(firstLine))
  const hashtags = /#[a-zA-ZÀ-ÿ0-9_]{2,}/.test(text)
  const cta =
    /\?/.test(lastThree) ||
    /comment(ez)?|dites|partagez|qu'en pensez|et vous|votre avis|réagissez|laissez|rejoignez|découvrez|envoyez|suivez|abonnez|like|liker|taguez/i.test(lastThree)
  return { hook, cta, hashtags }
}

function ElementBadge({ ok, label, icon }: { ok: boolean; label: string; icon: React.ReactNode }) {
  return (
    <span
      title={ok ? `${label} ✓` : `${label} manquant — complété par l'IA`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
        background: ok ? 'rgba(52,199,89,0.10)' : 'rgba(255,149,0,0.10)',
        color: ok ? '#1a7f37' : '#b05a00',
      }}
    >
      {icon}
      {label}
      {ok
        ? <Check style={{ width: 10, height: 10 }} />
        : <span style={{ fontSize: 10, fontWeight: 700 }}>!</span>
      }
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// HTML helpers
// ─────────────────────────────────────────────────────────────

function htmlToText(html: string): string {
  if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, '')
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('p, h1, h2, h3, li').forEach(el => el.insertAdjacentText('afterend', '\n'))
  div.querySelectorAll('br').forEach(el => el.replaceWith('\n'))
  div.querySelectorAll('img').forEach(el => el.remove())
  let text = (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
  text = text.split('\n').filter(line => {
    const t = line.trim()
    if (!t) return true
    if (t.length >= 3 && t === t.toUpperCase() && /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]{3}/.test(t) && t.length < 60) return false
    if (/^(jour|day|week|chapitre|partie|section)\s+\d+/i.test(t)) return false
    return true
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return text
}

function extractImagesFromHtml(html: string): string[] {
  if (typeof window === 'undefined') return []
  const div = document.createElement('div')
  div.innerHTML = html
  const imgs: string[] = []
  div.querySelectorAll('img').forEach(el => {
    const src = el.getAttribute('src') || ''
    if (src && /^(https?:|data:image\/(png|jpe?g|gif|webp|svg))/.test(src)) imgs.push(src)
  })
  return imgs
}

// ─────────────────────────────────────────────────────────────
// Smart slots
// ─────────────────────────────────────────────────────────────

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function analyzeSmartSlots(publishedPosts: Array<{ scheduled_at: string; status: string }>): SmartSlot[] {
  const published = publishedPosts.filter(p => p.status === 'published' && p.scheduled_at)
  if (published.length < 3) {
    return [
      { hour: 8, day: 2, dayLabel: 'Mardi', score: 95, label: 'Meilleur créneau LinkedIn' },
      { hour: 9, day: 3, dayLabel: 'Mercredi', score: 90, label: 'Top engagement' },
      { hour: 12, day: 4, dayLabel: 'Jeudi', score: 85, label: 'Pause déjeuner' },
    ]
  }
  const heatmap: Record<string, number> = {}
  for (const p of published) {
    const d = new Date(p.scheduled_at)
    const key = `${d.getDay()}_${d.getHours()}`
    heatmap[key] = (heatmap[key] || 0) + 1
  }
  const maxCount = Math.max(...Object.values(heatmap), 1)
  return Object.entries(heatmap)
    .map(([key, count]) => {
      const [dayStr, hourStr] = key.split('_')
      const day = Number(dayStr), hour = Number(hourStr)
      return { day, hour, count, score: Math.round((count / maxCount) * 100) }
    })
    .sort((a, b) => b.count - a.count).slice(0, 3)
    .map(s => ({ hour: s.hour, day: s.day, dayLabel: DAYS_FR[s.day], score: s.score, label: `Posts publiés ${DAYS_FR[s.day]} à ${s.hour}h` }))
}

// ─────────────────────────────────────────────────────────────
// HTML → TEXT helpers  (mammoth gives us rich HTML, we use it)
// Note: htmlToText is already defined above (uses DOM when available)
// ─────────────────────────────────────────────────────────────

/**
 * Convert mammoth HTML to a "structured text" where Word headings
 * become ## markers — sent to the API as a reliable signal.
 */
function htmlToStructuredText(html: string): string {
  return html
    .replace(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi, '\n\n## $1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Split a Word doc HTML (from mammoth) into posts using heading tags.
 * Returns null if the document has no heading structure.
 *
 * This is the PRIMARY strategy for .docx — it reads the ACTUAL Word
 * heading styles (h1/h2/h3/h4) that extractRawText would have lost.
 */
function splitHtmlByHeadings(html: string): string[] | null {
  const headingMatches = html.match(/<h[1-4][^>]*>/gi) || []
  if (headingMatches.length < 2) return null   // no heading structure

  // Find the most common heading level (the one used for post titles)
  const levelCounts: Record<string, number> = {}
  for (const tag of headingMatches) {
    const lvl = (tag.match(/h([1-4])/i) || [])[1] || '1'
    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1
  }
  const dominantLevel = Object.entries(levelCounts)
    .sort((a, b) => b[1] - a[1])[0][0]

  // Split on the dominant heading level
  const splitRe = new RegExp(`<h${dominantLevel}[^>]*>`, 'gi')
  const parts = html.split(splitRe)
  // parts[0] = intro text before first heading (author bio, etc.)

  const posts: string[] = []
  for (let i = 1; i < parts.length; i++) {
    const text = htmlToText(parts[i]).trim()
    if (text.length >= 80) posts.push(text)
  }

  // If the intro is long enough to be a post, prepend it
  if (parts[0]) {
    const introText = htmlToText(parts[0]).trim()
    if (introText.length >= 150) posts.unshift(introText)
  }

  return posts.length >= 2 ? posts : null
}

// ─────────────────────────────────────────────────────────────
// Direct AI split — bypasses Vercel (avoids 10s timeout)
// Calls Supabase edge function directly from the browser
// ─────────────────────────────────────────────────────────────

const AI_SPLITTER_URL = 'https://bvsfclqlopzkfmeinbqs.supabase.co/functions/v1/ai-doc-splitter'
const AI_CHUNK_SIZE = 2800   // chars per chunk sent to Claude
const AI_CHUNK_OVERLAP = 80  // overlap to avoid cutting mid-post

async function splitWithAIDirectly(text: string): Promise<string[]> {
  // Chunk the document
  const chunks: string[] = []
  let pos = 0
  while (pos < text.length) {
    let end = Math.min(pos + AI_CHUNK_SIZE, text.length)
    if (end < text.length) {
      const lb = text.lastIndexOf('\n\n', end)
      if (lb > pos + AI_CHUNK_SIZE / 2) end = lb
    }
    const chunk = text.slice(pos, end).trim()
    if (chunk.length >= 50) chunks.push(chunk)
    pos = end - AI_CHUNK_OVERLAP
    if (pos >= text.length) break
  }

  // Process chunks — batch of 3 in parallel
  const BATCH = 3
  const allPosts: string[] = []
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(async chunk => {
      try {
        const res = await fetch(AI_SPLITTER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chunk }),
        })
        if (!res.ok) return [] as string[]
        const data = await res.json()
        return (data.posts || []) as string[]
      } catch { return [] as string[] }
    }))
    for (const posts of results) {
      for (const post of posts) {
        const last = allPosts[allPosts.length - 1] || ''
        if (post.trim().length >= 50 && post.slice(0, 60) !== last.slice(0, 60)) {
          allPosts.push(post.trim())
        }
      }
    }
  }
  return allPosts
}

// ─────────────────────────────────────────────────────────────
// API call (rule-based via Next.js)
// ─────────────────────────────────────────────────────────────

async function apiSplit(text: string, filename: string, forceAI = false): Promise<{ posts: string[]; structure: string; method: string; warning: string | null }> {
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, filename, forceAI }),
  })
  const raw = await res.text()
  let data: any
  try { data = JSON.parse(raw) } catch { throw new Error(`Réponse serveur invalide (${res.status})`) }
  // 422 = AI unavailable but we have partial results
  if (res.status === 422 && data.warning === 'ai_unavailable') {
    if (data.posts?.length) return { posts: data.posts as string[], structure: data.structure || '', method: 'partial', warning: 'ai_unavailable' }
    throw new Error(data?.error || 'Crédits IA épuisés')
  }
  if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`)
  return { posts: data.posts as string[], structure: data.structure || '', method: data.method || '', warning: (data.warning as string | null) || null }
}

// ─────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────

const T = {
  primary: '#0A66C2',
  primaryLight: 'rgba(10,102,194,0.08)',
  primaryRing: 'rgba(10,102,194,0.18)',
  bg: '#f5f5f7',
  white: '#ffffff',
  gray1: '#1d1d1f',
  gray2: '#3a3a3c',
  gray3: '#6e6e73',
  gray4: '#aeaeb2',
  gray5: '#d1d1d6',
  gray6: '#f5f5f7',
  radius: { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 },
  shadow: {
    modal: '0 32px 80px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.06)',
    card: '0 2px 12px rgba(0,0,0,0.06)',
    cardSelected: '0 0 0 2px #0A66C2, 0 4px 16px rgba(10,102,194,0.12)',
  },
}

// ─────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            height: 6,
            width: i === current ? 20 : 6,
            borderRadius: T.radius.pill,
            background: i === current ? T.primary : T.gray5,
            transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function BulkImport({
  onImport, onClose, isPremium = false, plan = 'free', publishedPosts = [], authorAvatar, authorName,
}: BulkImportProps) {
  const isFreePlan = plan === 'free'
  const [step, setStep] = useState<'upload' | 'preview' | 'schedule' | 'success'>('upload')
  const [successCount, setSuccessCount] = useState(0)
  const [successRange, setSuccessRange] = useState('')
  const [showUpgradeGate, setShowUpgradeGate] = useState(false)
  const [posts, setPosts] = useState<string[]>([])
  const [postImages, setPostImages] = useState<Record<number, string[]>>({})
  const [filename, setFilename] = useState('')
  const [rawText, setRawText] = useState('')           // original document text for AI retry
  const [structure, setStructure] = useState('')
  const [method, setMethod] = useState('')
  const [importWarning, setImportWarning] = useState<string | null>(null)
  const [retryingAI, setRetryingAI] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set())
  const [frequency, setFrequency] = useState<'daily' | '3x_week' | 'weekdays' | 'weekly'>('3x_week')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('08:00')
  const [dragOver, setDragOver] = useState(false)
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set())
  const [editingPosts, setEditingPosts] = useState<Set<number>>(new Set())
  const [editedContent, setEditedContent] = useState<Record<number, string>>({})
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [aiLoadingIdx, setAiLoadingIdx] = useState<number | null>(null)
  const [aiVariants, setAiVariants] = useState<AIVariant[] | null>(null)
  const [aiModalIdx, setAiModalIdx] = useState<number | null>(null)
  const [aiError, setAiError] = useState('')

  // ── File handling ──

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')
    try {
      const ext = file.name.toLowerCase().split('.').pop() || ''
      let rawText = ''
      let finalPosts: string[] = []

      if (ext === 'docx' || ext === 'doc') {
        setLoadingMsg('Extraction du document Word…')
        const arrayBuffer = await file.arrayBuffer()
        const mammoth = await import('mammoth')
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
        const textResult = await mammoth.extractRawText({ arrayBuffer })
        rawText = textResult.value
        const html = htmlResult.value

        setLoadingMsg('Analyse de la structure…')

        // ── Priority 1: HTML heading structure (Word heading styles → h1/h2/h3) ──
        // This is always the best strategy when the author used Word heading styles.
        // extractRawText would have lost this info; we use htmlResult directly.
        const headingPosts = splitHtmlByHeadings(html)

        if (headingPosts && headingPosts.length >= 2) {
          finalPosts = headingPosts
          setPosts(headingPosts); setPostImages({}); setStructure('word-headings'); setMethod('html-headings'); setImportWarning(null)
        } else {
          // ── Priority 2: Send structured text (## markers) to the API ──
          // Better than rawText: headings become ## markers the API can detect
          const structuredText = htmlToStructuredText(html)
          const textToSend = structuredText.length > rawText.length * 0.5 ? structuredText : rawText
          const { posts: extracted, structure: s, method: m, warning: w } = await apiSplit(textToSend, file.name)
          finalPosts = extracted

          const images: Record<number, string[]> = {}
          if (html.includes('<img')) {
            const allImgs = extractImagesFromHtml(html)
            if (allImgs.length > 0) {
              const perPost = Math.ceil(allImgs.length / extracted.length)
              extracted.forEach((_, i) => {
                const slice = allImgs.slice(i * perPost, (i + 1) * perPost)
                if (slice.length > 0) images[i] = slice
              })
            }
          }
          setPosts(extracted); setPostImages(images); setStructure(s); setMethod(m); setImportWarning(w ?? null)
        }
      } else if (['txt', 'md', 'csv', 'rtf', 'pdf'].includes(ext)) {
        setLoadingMsg('Lecture du fichier…')
        rawText = await file.text()
        setLoadingMsg('Analyse de la structure…')
        const { posts: extracted, structure: s, method: m, warning: w } = await apiSplit(rawText, file.name)
        finalPosts = extracted
        setPosts(extracted); setPostImages({}); setStructure(s); setMethod(m); setImportWarning(w ?? null)
      } else {
        throw new Error(`Format "${ext}" non supporté. Utilise .docx, .txt, .md ou .pdf`)
      }

      setFilename(file.name)
      setRawText(rawText)
      setSelectedPosts(new Set(finalPosts.map((_, i) => i)))
      setExpandedPosts(new Set()); setEditingPosts(new Set()); setEditedContent({})
      setStep('preview')
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import")
    } finally {
      setLoading(false); setLoadingMsg('')
    }
  }

  // ── Retry with AI (direct Supabase call — bypasses Vercel timeout) ──

  const handleRetryWithAI = async () => {
    if (!rawText || retryingAI) return
    setRetryingAI(true)
    setAiError('')
    setError('')
    try {
      const extracted = await splitWithAIDirectly(rawText)
      if (extracted.length >= 2) {
        setPosts(extracted)
        setStructure('ai-direct'); setMethod('ai'); setImportWarning(null)
        setSelectedPosts(new Set(extracted.map((_, i) => i)))
        setExpandedPosts(new Set()); setEditingPosts(new Set()); setEditedContent({})
      } else {
        setAiError("L'IA n'a pas détecté de posts. Essaie de séparer tes posts avec --- dans le document.")
      }
    } catch (err: any) {
      setAiError(err.message || "Erreur IA — réessaie dans quelques secondes.")
    } finally {
      setRetryingAI(false)
    }
  }

  // ── Post helpers ──

  const togglePost = (idx: number) => {
    const next = new Set(selectedPosts)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    setSelectedPosts(next)
  }
  const toggleExpand = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(expandedPosts)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    setExpandedPosts(next)
  }
  const startEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPosts(prev => { const s = new Set(prev); s.add(idx); return s })
    setExpandedPosts(prev => { const s = new Set(prev); s.add(idx); return s })
    if (!(idx in editedContent)) setEditedContent(prev => ({ ...prev, [idx]: posts[idx] }))
  }
  const saveEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPosts(prev => { const s = new Set(prev); s.delete(idx); return s })
  }
  const cancelEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPosts(prev => { const s = new Set(prev); s.delete(idx); return s })
    setEditedContent(prev => { const c = { ...prev }; delete c[idx]; return c })
  }
  const getContent = (idx: number): string => idx in editedContent ? editedContent[idx] : posts[idx]

  // ── AI Reformulation ──

  const handleAIReformulate = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isPremium) return
    setAiLoadingIdx(idx); setAiError(''); setAiVariants(null); setAiModalIdx(null)
    try {
      const resp = await fetch('/api/ai/reformulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: getContent(idx) }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Erreur IA')
      setAiVariants(data.variants || []); setAiModalIdx(idx)
    } catch (err: any) {
      setAiError(err.message || 'Erreur reformulation IA')
    } finally {
      setAiLoadingIdx(null)
    }
  }
  const applyVariant = (variant: AIVariant) => {
    if (aiModalIdx === null) return
    setEditedContent(prev => ({ ...prev, [aiModalIdx]: variant.content }))
    setEditingPosts(prev => { const s = new Set(prev); s.delete(aiModalIdx); return s })
    setAiModalIdx(null); setAiVariants(null)
  }

  // ── Schedule ──

  const getNextDate = (current: Date, freq: string): Date => {
    const next = new Date(current)
    const day = next.getDay()
    if (freq === 'daily') next.setDate(next.getDate() + 1)
    else if (freq === '3x_week') {
      if (day === 1) next.setDate(next.getDate() + 2)
      else if (day === 3) next.setDate(next.getDate() + 2)
      else if (day === 5) next.setDate(next.getDate() + 3)
      else next.setDate(next.getDate() + ((8 - day) % 7 || 7))
    } else if (freq === 'weekdays') {
      next.setDate(next.getDate() + 1)
      while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1)
    } else next.setDate(next.getDate() + 7)
    return next
  }

  const handleSchedule = async () => {
    setScheduling(true)
    try {
      const timeline = computeTimeline()
      const scheduled = timeline.map(({ idx, date }) => ({
        content: getContent(idx),
        scheduledAt: date.toISOString(),
        status: 'scheduled',
        images: postImages[idx] || [],
      }))
      await onImport(scheduled)
      // Build range label for success screen
      if (timeline.length > 0) {
        const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
        const first = fmt(timeline[0].date)
        const last = fmt(timeline[timeline.length - 1].date)
        setSuccessRange(timeline.length === 1 ? `le ${first}` : `du ${first} au ${last}`)
        setSuccessCount(timeline.length)
      }
      setStep('success')
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la planification. Réessaie.')
    } finally {
      setScheduling(false)
    }
  }

  // ── Timeline compute ──

  const computeTimeline = (): { idx: number; date: Date }[] => {
    const selected = posts.map((_, i) => i).filter(i => selectedPosts.has(i))
    if (!startDate || !startTime || selected.length === 0) return []
    let currentDate = new Date(`${startDate}T${startTime}:00`)
    if (isNaN(currentDate.getTime())) return []
    return selected.map((i, n) => {
      if (n > 0) currentDate = getNextDate(currentDate, frequency)
      return { idx: i, date: new Date(currentDate) }
    })
  }

  const applySmartSlot = (slot: SmartSlot) => {
    setStartTime(`${String(slot.hour).padStart(2, '0')}:00`)
    const today = new Date(); const d = new Date(today)
    let diff = slot.day - today.getDay()
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  const smartSlots = analyzeSmartSlots(publishedPosts)
  const stepIndex = step === 'upload' ? 0 : step === 'preview' ? 1 : 2
  const stepLabel = step === 'upload' ? 'Importer' : step === 'preview' ? 'Sélectionner les posts' : step === 'schedule' ? 'Programmer' : '✓ Planifié'

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <>
    {/* LinkedIn Preview */}
    {previewIdx !== null && (
      <LinkedInPreview
        content={getContent(previewIdx)}
        images={postImages[previewIdx] || []}
        authorAvatar={authorAvatar}
        authorName={authorName}
        onClose={() => setPreviewIdx(null)}
      />
    )}

    {/* AI Variants Modal */}
    {aiModalIdx !== null && aiVariants && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(32px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div style={{
          background: T.white, borderRadius: T.radius.xl, boxShadow: T.shadow.modal,
          width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: `1px solid ${T.gray6}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: T.radius.md, background: T.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles style={{ width: 16, height: 16, color: T.primary }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.gray1 }}>3 variantes générées par IA</div>
                <div style={{ fontSize: 12, color: T.gray4, marginTop: 1 }}>Post {(aiModalIdx ?? 0) + 1} — clique pour appliquer</div>
              </div>
            </div>
            <button onClick={() => { setAiModalIdx(null); setAiVariants(null) }}
              style={{ width: 28, height: 28, borderRadius: T.radius.pill, border: 'none', background: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 14, height: 14, color: T.gray3 }} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {aiVariants.map((v, i) => (
              <button key={i} onClick={() => applyVariant(v)} style={{
                width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: T.radius.lg,
                border: `1.5px solid ${T.gray5}`, background: T.white, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.primary; (e.currentTarget as HTMLElement).style.background = T.primaryLight }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.gray5; (e.currentTarget as HTMLElement).style.background = T.white }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ padding: '2px 10px', borderRadius: T.radius.pill, background: T.primaryLight, color: T.primary, fontSize: 11, fontWeight: 600 }}>{v.format}</span>
                  <span style={{ fontSize: 11, color: T.gray4 }}>{v.description}</span>
                </div>
                <p style={{ fontSize: 13, color: T.gray2, lineHeight: 1.6, margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {v.content}
                </p>
                <p style={{ fontSize: 11, color: T.gray4, marginTop: 6 }}>{v.content.length} car.</p>
              </button>
            ))}
          </div>
          <div style={{ padding: '12px 24px', borderTop: `1px solid ${T.gray6}`, textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: T.gray4 }}>✨ Powered by Claude AI</span>
          </div>
        </div>
      </div>
    )}

    {/* Upgrade gate modal */}
    {showUpgradeGate && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(24px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div style={{
          background: '#111116', border: '1px solid rgba(10,102,194,0.2)',
          borderRadius: 24, padding: '32px 28px', maxWidth: 420, width: '100%',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}>
          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'rgba(10,102,194,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Calendar style={{ width: 28, height: 28, color: T.primary }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#E5E7EB', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Planification verrouillée
            </h2>
            <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>
              Tu viens de voir l'IA détecter <strong style={{ color: '#E5E7EB' }}>{selectedPosts.size} posts</strong> dans ton document.
              <br />Passe en Solo pour les planifier automatiquement.
            </p>
          </div>

          {/* Plan cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { plan: 'solo', label: 'Solo', price: '19€/mois', features: '5 imports · 20 reformulations · Posts illimités', color: '#6366f1', highlight: true },
              { plan: 'agence', label: 'Agence', price: '59€/mois', features: '20 imports · 80 reformulations · Multi-comptes', color: T.primary, highlight: false },
            ].map(p => (
              <button key={p.plan}
                onClick={() => { window.location.href = `/api/stripe/checkout?plan=${p.plan}` }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 14,
                  border: p.highlight ? `1.5px solid ${p.color}66` : `1.5px solid ${p.color}33`,
                  background: p.highlight ? `${p.color}18` : `${p.color}0a`,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB' }}>{p.label} — {p.price}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{p.features}</div>
                </div>
                <div style={{
                  padding: '7px 16px', borderRadius: 999,
                  background: p.color, color: '#fff',
                  fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                }}>Choisir →</div>
              </button>
            ))}
          </div>

          {/* What they'll unlock */}
          <div style={{ padding: '12px 14px', background: 'rgba(10,102,194,0.07)', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.primary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ce que tu débloqueras
            </div>
            {[
              `Planifier tes ${selectedPosts.size} posts en 1 clic`,
              'Choisir ta cadence (3×/sem, quotidien…)',
              'LinkedIn publie automatiquement',
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < 2 ? 6 : 0 }}>
                <Check style={{ width: 12, height: 12, color: T.primary, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#D1D5DB' }}>{f}</span>
              </div>
            ))}
          </div>

          <button onClick={() => setShowUpgradeGate(false)}
            style={{ width: '100%', padding: '10px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent', color: '#6B7280', fontSize: 13, cursor: 'pointer' }}>
            Continuer sans planifier
          </button>
        </div>
      </div>
    )}

    {/* Main modal */}
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(32px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: T.white, borderRadius: 28, boxShadow: T.shadow.modal,
        width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 24px 16px' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.gray1, letterSpacing: '-0.01em' }}>{stepLabel}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 12, color: T.gray4 }}>
                {step === 'upload' ? 'Tout format accepté — l\'IA s\'adapte' :
                 step === 'preview' ? `${selectedPosts.size} / ${posts.length} posts sélectionnés` :
                 step === 'schedule' ? 'Fréquence et date de début' :
                 successRange}
              </span>
              {step === 'preview' && isFreePlan && posts.length > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: T.radius.pill, fontSize: 10, fontWeight: 700,
                  background: 'rgba(255,149,0,0.10)', color: '#b05a00',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  <svg style={{ width: 9, height: 9 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Planification verrouillée
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StepDots current={stepIndex} />
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: T.radius.pill, border: 'none',
              background: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X style={{ width: 14, height: 14, color: T.gray3 }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 8px' }}>

          {/* ── STEP 1 : Upload ── */}
          {step === 'upload' && (
            <div>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                style={{
                  background: dragOver ? T.primaryLight : T.bg,
                  borderRadius: T.radius.xl, padding: '36px 24px',
                  textAlign: 'center', transition: 'background 0.2s',
                  border: dragOver ? `2px solid ${T.primary}` : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <Loader2 style={{ width: 28, height: 28, color: T.primary, animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontSize: 14, fontWeight: 500, color: T.gray2 }}>{loadingMsg}</div>
                    <div style={{ fontSize: 12, color: T.gray4 }}>Analyse en cours…</div>
                  </div>
                ) : (
                  <>
                    {/* White card icon */}
                    <div style={{
                      width: 56, height: 56, borderRadius: T.radius.lg, background: T.white,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                    }}>
                      <Upload style={{ width: 24, height: 24, color: T.primary }} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.gray1, marginBottom: 6 }}>
                      Glisse ton fichier ici
                    </div>
                    <div style={{ fontSize: 13, color: T.gray4, marginBottom: 16 }}>
                      .docx · .txt · .md · .pdf · .csv — tout format
                    </div>
                    <label style={{
                      display: 'inline-block', padding: '9px 20px', background: T.primary,
                      color: T.white, fontSize: 13, fontWeight: 600, borderRadius: T.radius.pill,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}>
                      Parcourir
                      <input type="file" style={{ display: 'none' }}
                        accept=".docx,.doc,.txt,.md,.csv,.pdf,.rtf"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                    </label>
                  </>
                )}
              </div>

              {error && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '10px 14px', background: 'rgba(255,59,48,0.06)', borderRadius: T.radius.md,
                  border: '1px solid rgba(255,59,48,0.12)', color: '#c0392b', fontSize: 13 }}>
                  <AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}

              {/* How it works */}
              <div style={{ marginTop: 16, padding: '14px 16px', background: T.bg, borderRadius: T.radius.lg }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.gray2, marginBottom: 10 }}>Comment ça marche</div>
                {[
                  { n: '1', text: 'Importe n\'importe quel document — Word, texte, PDF' },
                  { n: '2', text: 'L\'IA détecte la structure et sépare les posts automatiquement' },
                  { n: '3', text: 'Chaque post est complété : Hook · Hashtags · CTA' },
                ].map(item => (
                  <div key={item.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7 }}>
                    <div style={{ width: 20, height: 20, borderRadius: T.radius.pill, background: T.primary,
                      color: T.white, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{item.n}</div>
                    <div style={{ fontSize: 12, color: T.gray3, lineHeight: 1.5 }}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2 : Preview ── */}
          {step === 'preview' && (
            <div>
              {/* File info + controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FileText style={{ width: 14, height: 14, color: T.gray4, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: T.gray4, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</span>
                {method === 'ai' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                    borderRadius: T.radius.pill, background: T.primaryLight, color: T.primary, fontSize: 11, fontWeight: 600 }}>
                    <Sparkles style={{ width: 10, height: 10 }} /> IA
                  </span>
                )}
                <button
                  onClick={() => setSelectedPosts(selectedPosts.size === posts.length ? new Set() : new Set(posts.map((_, i) => i)))}
                  style={{ marginLeft: 'auto', fontSize: 12, color: T.primary, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {selectedPosts.size === posts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {/* ── Banner: AI repair — always visible ── */}
              {(() => {
                const avgLen = posts.length > 0 ? posts.reduce((s, p) => s + p.length, 0) / posts.length : 999
                const looksOff = avgLen < 250 || importWarning === 'ai_unavailable' || method !== 'ai'
                const bannerBg = looksOff ? 'rgba(255,59,48,0.06)' : 'rgba(0,122,255,0.05)'
                const bannerBorder = looksOff ? '1px solid rgba(255,59,48,0.15)' : '1px solid rgba(0,122,255,0.12)'
                const iconColor = looksOff ? '#c0392b' : T.primary
                const btnBg = retryingAI ? T.gray5 : (looksOff ? '#c0392b' : T.primary)
                return (
                  <div style={{ padding: '12px 14px', marginBottom: 10, borderRadius: T.radius.md,
                    background: bannerBg, border: bannerBorder,
                    display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle style={{ width: 14, height: 14, color: iconColor, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: iconColor }}>
                        {looksOff ? 'Posts mal séparés ?' : 'Résultat incorrect ?'}
                      </span>
                      <span style={{ fontSize: 12, color: looksOff ? '#7f3838' : T.gray3, marginLeft: 6 }}>
                        {posts.length} posts · moy. {Math.round(avgLen)} car.
                      </span>
                    </div>
                    <button
                      onClick={handleRetryWithAI}
                      disabled={retryingAI || !rawText}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 14px', borderRadius: T.radius.pill, border: 'none',
                        background: btnBg, color: T.white,
                        fontSize: 12, fontWeight: 600, cursor: retryingAI ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                      {retryingAI
                        ? <><Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> IA en cours…</>
                        : <><Sparkles style={{ width: 11, height: 11 }} /> Réparer avec l'IA</>}
                    </button>
                  </div>
                )
              })()}

              {/* ── Warning: AI unavailable, partial detection ── */}
              {importWarning === 'ai_unavailable' && (
                <div style={{ padding: '12px 14px', marginBottom: 10, borderRadius: T.radius.md,
                  background: 'rgba(255,149,0,0.07)', border: '1px solid rgba(255,149,0,0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <AlertCircle style={{ width: 14, height: 14, color: '#b05a00', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#b05a00' }}>
                      Détection partielle — {posts.length} posts trouvés
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#92400e', margin: '0 0 8px 22px', lineHeight: 1.5 }}>
                    L'IA n'est pas disponible (crédits épuisés). La détection automatique ne peut pas analyser
                    la structure complète de ce document.
                  </p>
                  <div style={{ marginLeft: 22, padding: '8px 10px', background: 'rgba(255,255,255,0.6)',
                    borderRadius: T.radius.sm, fontSize: 11, color: '#78350f' }}>
                    <strong>Solution rapide :</strong> ouvre ton document et ajoute{' '}
                    <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 4 }}>---</code>{' '}
                    sur une ligne seule entre chaque post → l'importeur détectera tous les {posts.length}+ posts sans IA.
                  </div>
                </div>
              )}

              {aiError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 10,
                  background: 'rgba(255,59,48,0.06)', borderRadius: T.radius.md, color: '#c0392b', fontSize: 12 }}>
                  <AlertCircle style={{ width: 14, height: 14 }} />{aiError}
                </div>
              )}

              {!isPremium && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 10,
                  background: 'rgba(255,149,0,0.06)', borderRadius: T.radius.md, color: '#b05a00', fontSize: 12,
                  border: '1px solid rgba(255,149,0,0.12)' }}>
                  <Star style={{ width: 14, height: 14 }} />
                  <span>Passe en <strong>Premium</strong> pour reformuler chaque post avec l'IA.</span>
                </div>
              )}

              {/* Post cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {posts.map((_, idx) => {
                  const content = getContent(idx)
                  const isSelected = selectedPosts.has(idx)
                  const isExpanded = expandedPosts.has(idx)
                  const isEditing = editingPosts.has(idx)
                  const isAiLoading = aiLoadingIdx === idx
                  const elements = detectElements(content)
                  const imgs = postImages[idx] || []

                  return (
                    <div
                      key={idx}
                      onClick={() => togglePost(idx)}
                      style={{
                        borderRadius: T.radius.lg, background: T.white, cursor: 'pointer',
                        transition: 'box-shadow 0.18s, border-color 0.18s',
                        boxShadow: isSelected ? T.shadow.cardSelected : T.shadow.card,
                        border: isSelected ? `2px solid ${T.primary}` : '2px solid transparent',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Card top */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px 8px' }}>
                        {/* Checkbox */}
                        <div style={{
                          width: 18, height: 18, borderRadius: 6, flexShrink: 0, marginTop: 2,
                          background: isSelected ? T.primary : 'transparent',
                          border: isSelected ? 'none' : `1.5px solid ${T.gray5}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {isSelected && <Check style={{ width: 10, height: 10, color: T.white }} />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Meta row */}
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: T.gray3 }}>Post {idx + 1}</span>
                            <span style={{ fontSize: 11, color: T.gray5 }}>·</span>
                            <span style={{ fontSize: 11, color: T.gray4 }}>{content.length} car.</span>
                            {imgs.length > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: T.primary }}>
                                <ImageIcon style={{ width: 10, height: 10 }} />{imgs.length}
                              </span>
                            )}
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              <ElementBadge ok={elements.hook} label="Hook" icon={<Zap style={{ width: 9, height: 9 }} />} />
                              <ElementBadge ok={elements.hashtags} label="#Tags" icon={<Hash style={{ width: 9, height: 9 }} />} />
                              <ElementBadge ok={elements.cta} label="CTA" icon={<MessageCircle style={{ width: 9, height: 9 }} />} />
                            </div>
                          </div>

                          {/* Content */}
                          {isEditing ? (
                            <textarea
                              value={idx in editedContent ? editedContent[idx] : content}
                              onChange={e => setEditedContent(prev => ({ ...prev, [idx]: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              rows={8}
                              style={{
                                width: '100%', fontSize: 13, color: T.gray2, lineHeight: 1.6,
                                border: `1.5px solid ${T.primary}`, borderRadius: T.radius.md,
                                padding: '8px 10px', resize: 'none', outline: 'none',
                                background: T.white, fontFamily: 'inherit', boxSizing: 'border-box',
                              }}
                            />
                          ) : (
                            <p style={{
                              fontSize: 13, color: T.gray2, lineHeight: 1.6, margin: 0,
                              display: isExpanded ? 'block' : '-webkit-box',
                              WebkitLineClamp: isExpanded ? undefined : 3,
                              WebkitBoxOrient: isExpanded ? undefined : 'vertical',
                              overflow: isExpanded ? 'visible' : 'hidden',
                              whiteSpace: 'pre-wrap',
                            }}>
                              {content}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions bar */}
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 2, padding: '6px 14px 10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <ActionBtn icon={isExpanded ? <ChevronUp style={{ width: 11, height: 11 }} /> : <ChevronDown style={{ width: 11, height: 11 }} />}
                          label={isExpanded ? 'Réduire' : 'Voir tout'} onClick={e => toggleExpand(idx, e)} />

                        {isEditing ? (
                          <>
                            <ActionBtn icon={<Check style={{ width: 11, height: 11 }} />} label="Sauvegarder" onClick={e => saveEdit(idx, e)} color="#1a7f37" />
                            <ActionBtn icon={<X style={{ width: 11, height: 11 }} />} label="Annuler" onClick={e => cancelEdit(idx, e)} />
                          </>
                        ) : (
                          <ActionBtn icon={<Pencil style={{ width: 11, height: 11 }} />} label="Éditer" onClick={e => startEdit(idx, e)} />
                        )}

                        <ActionBtn
                          icon={<svg style={{ width: 11, height: 11 }} viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>}
                          label="Aperçu" onClick={e => { e.stopPropagation(); setPreviewIdx(idx) }} color={T.primary} />

                        {isPremium && (
                          <ActionBtn
                            icon={isAiLoading ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 11, height: 11 }} />}
                            label="Reformuler" onClick={e => handleAIReformulate(idx, e)}
                            color="#7c3aed" disabled={isAiLoading} style={{ marginLeft: 'auto' }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3 : Schedule ── */}
          {step === 'schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Smart slots */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Star style={{ width: 14, height: 14, color: '#f59e0b' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.gray1 }}>Créneaux optimaux LinkedIn</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {smartSlots.map((slot, i) => (
                    <button key={i} onClick={() => applySmartSlot(slot)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      borderRadius: T.radius.md, border: `1.5px solid ${T.gray5}`, background: T.white,
                      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.primary; (e.currentTarget as HTMLElement).style.background = T.primaryLight }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.gray5; (e.currentTarget as HTMLElement).style.background = T.white }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: T.radius.md, background: T.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Clock style={{ width: 16, height: 16, color: T.primary }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.gray1 }}>{slot.dayLabel} à {slot.hour}h</div>
                        <div style={{ fontSize: 11, color: T.gray4 }}>{slot.label}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <div style={{ height: 4, width: 50, background: T.gray5, borderRadius: T.radius.pill, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${slot.score}%`, background: T.primary, borderRadius: T.radius.pill }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.primary }}>{slot.score}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Date de début', type: 'date', value: startDate, onChange: setStartDate },
                  { label: 'Heure', type: 'time', value: startTime, onChange: setStartTime },
                ].map(field => (
                  <div key={field.type}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: T.gray4, marginBottom: 5 }}>{field.label}</div>
                    <input type={field.type} value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                      style={{
                        width: '100%', padding: '9px 12px', fontSize: 13, color: T.gray1,
                        background: T.bg, border: 'none', borderRadius: T.radius.md, outline: 'none',
                        boxSizing: 'border-box', fontFamily: 'inherit',
                      }} />
                  </div>
                ))}
              </div>

              {/* Frequency */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: T.gray4, marginBottom: 8 }}>Fréquence de publication</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { value: 'daily', label: 'Chaque jour', sub: '7×/sem.' },
                    { value: '3x_week', label: '3× par semaine', sub: 'Lun · Mer · Ven' },
                    { value: 'weekdays', label: 'Jours ouvrés', sub: 'Lun → Ven' },
                    { value: 'weekly', label: 'Hebdomadaire', sub: '1×/sem.' },
                  ] as const).map(opt => (
                    <button key={opt.value} onClick={() => setFrequency(opt.value)} style={{
                      padding: '10px 14px', borderRadius: T.radius.md, border: 'none', textAlign: 'left',
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: frequency === opt.value ? T.primary : T.bg,
                      color: frequency === opt.value ? T.white : T.gray2,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: T.primaryLight, borderRadius: T.radius.md, fontSize: 12, color: T.primary }}>
                <Calendar style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>
                  <strong>{selectedPosts.size} posts</strong> à partir du{' '}
                  <strong>{new Date(`${startDate}T${startTime}`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong>{' '}
                  à <strong>{startTime}</strong>
                </span>
              </div>

              {/* Timeline preview */}
              {(() => {
                const timeline = computeTimeline()
                if (timeline.length === 0) return null
                const SHOW = 5
                const shown = timeline.slice(0, SHOW)
                const hidden = timeline.length - SHOW
                const lastItem = hidden > 0 ? timeline[timeline.length - 1] : null
                const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                const fmtTime = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.gray4, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Calendrier de publication
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {shown.map(({ idx, date }, n) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                          background: n === 0 ? T.primaryLight : T.bg, borderRadius: T.radius.md,
                          border: n === 0 ? `1px solid ${T.primaryRing}` : '1px solid transparent' }}>
                          <div style={{ width: 20, height: 20, borderRadius: T.radius.pill, flexShrink: 0,
                            background: n === 0 ? T.primary : T.gray5,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: n === 0 ? T.white : T.gray3 }}>
                            {idx + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 11, color: T.gray2, margin: 0,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                              {getContent(idx).slice(0, 60)}{getContent(idx).length > 60 ? '…' : ''}
                            </p>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: n === 0 ? T.primary : T.gray2 }}>{fmtDate(date)}</div>
                            <div style={{ fontSize: 10, color: T.gray4 }}>{fmtTime(date)}</div>
                          </div>
                        </div>
                      ))}
                      {hidden > 0 && (
                        <>
                          <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 11, color: T.gray4 }}>
                            · · · {hidden} autres posts · · ·
                          </div>
                          {lastItem && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                              background: T.bg, borderRadius: T.radius.md, border: '1px solid transparent' }}>
                              <div style={{ width: 20, height: 20, borderRadius: T.radius.pill, flexShrink: 0,
                                background: T.gray5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700, color: T.gray3 }}>
                                {lastItem.idx + 1}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 11, color: T.gray2, margin: 0,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                  {getContent(lastItem.idx).slice(0, 60)}{getContent(lastItem.idx).length > 60 ? '…' : ''}
                                </p>
                              </div>
                              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: T.gray2 }}>{fmtDate(lastItem.date)}</div>
                                <div style={{ fontSize: 10, color: T.gray4 }}>{fmtTime(lastItem.date)}</div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
          {/* ── STEP 4 : Success ── */}
          {step === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 8px 16px', gap: 20 }}>
              {/* Animated checkmark */}
              <div style={{
                width: 80, height: 80, borderRadius: '50%', background: 'rgba(52,199,89,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'successPop 0.5s cubic-bezier(.175,.885,.32,1.275) both',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: '#34c759',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check style={{ width: 28, height: 28, color: '#fff', strokeWidth: 3 }} />
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.gray1, letterSpacing: '-0.02em', marginBottom: 6 }}>
                  {successCount} post{successCount > 1 ? 's' : ''} planifié{successCount > 1 ? 's' : ''} !
                </div>
                <div style={{ fontSize: 13, color: T.gray3 }}>
                  {successRange}
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%', marginTop: 4 }}>
                {[
                  { value: successCount, label: 'posts' },
                  { value: frequency === 'daily' ? '7×' : frequency === '3x_week' ? '3×' : frequency === 'weekdays' ? '5×' : '1×', label: 'par semaine' },
                  {
                    value: (() => {
                      const tl = computeTimeline()
                      if (tl.length < 2) return '—'
                      const diff = tl[tl.length - 1].date.getTime() - tl[0].date.getTime()
                      const weeks = Math.round(diff / (7 * 24 * 60 * 60 * 1000))
                      return weeks < 2 ? `${Math.round(diff / (24 * 60 * 60 * 1000))}j` : `${weeks}sem`
                    })(),
                    label: 'de couverture',
                  },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: T.bg, borderRadius: T.radius.md, padding: '12px 10px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: T.primary, letterSpacing: '-0.02em' }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: T.gray4, marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ width: '100%', padding: '10px 14px', background: T.primaryLight,
                borderRadius: T.radius.md, fontSize: 12, color: T.primary, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>Tes posts sont visibles dans le calendrier. LinkedIn les publiera automatiquement.</span>
              </div>

              <style>{`
                @keyframes successPop {
                  from { transform: scale(0.5); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
              `}</style>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px 20px', borderTop: `1px solid ${T.gray6}` }}>
          {step !== 'success' && (
            <button onClick={step === 'upload' ? onClose : () => setStep(step === 'schedule' ? 'preview' : 'upload')}
              style={{ padding: '9px 16px', borderRadius: T.radius.pill, border: 'none', background: T.bg,
                fontSize: 13, color: T.gray3, cursor: 'pointer', fontWeight: 500 }}>
              {step === 'upload' ? 'Annuler' : '← Retour'}
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={() => {
                if (selectedPosts.size === 0) return
                if (isFreePlan) { setShowUpgradeGate(true); return }
                setStep('schedule')
              }}
              disabled={selectedPosts.size === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 20px', borderRadius: T.radius.pill, border: 'none',
                background: selectedPosts.size === 0 ? T.gray5 : T.primary, color: T.white,
                fontSize: 13, fontWeight: 600, cursor: selectedPosts.size === 0 ? 'not-allowed' : 'pointer',
              }}>
              {isFreePlan && selectedPosts.size > 0 && (
                <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              )}
              Programmer {selectedPosts.size > 0 ? `${selectedPosts.size} post${selectedPosts.size > 1 ? 's' : ''}` : ''} →
            </button>
          )}

          {step === 'schedule' && (
            <button onClick={handleSchedule} disabled={scheduling || selectedPosts.size === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: T.radius.pill,
                border: 'none', background: (scheduling || selectedPosts.size === 0) ? T.gray5 : T.primary,
                color: T.white, fontSize: 13, fontWeight: 600, cursor: (scheduling || selectedPosts.size === 0) ? 'not-allowed' : 'pointer' }}>
              {scheduling
                ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Programmation…</>
                : <><Calendar style={{ width: 14, height: 14 }} /> Planifier {selectedPosts.size} post{selectedPosts.size > 1 ? 's' : ''}</>}
            </button>
          )}

          {step === 'success' && (
            <button onClick={onClose}
              style={{ width: '100%', padding: '12px 20px', borderRadius: T.radius.pill, border: 'none',
                background: T.primary, color: T.white, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Voir mon calendrier →
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

// Small action button helper
function ActionBtn({ icon, label, onClick, color, disabled, style: extraStyle }: {
  icon: React.ReactNode; label: string; onClick: (e: React.MouseEvent) => void
  color?: string; disabled?: boolean; style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 8px', borderRadius: 999, border: 'none', background: 'transparent',
        fontSize: 11, color: color || '#6e6e73', cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 500, opacity: disabled ? 0.5 : 1, ...extraStyle,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {icon}{label}
    </button>
  )
}

