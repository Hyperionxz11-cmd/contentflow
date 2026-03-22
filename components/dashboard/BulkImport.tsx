'use client'

import { useState } from 'react'
import {
  Upload, FileText, Calendar, Check, X, Loader2,
  Pencil, Image as ImageIcon, Sparkles, Clock, AlertCircle,
  Hash, MessageCircle, Zap, ChevronDown, ChevronUp, Star, RefreshCw
} from 'lucide-react'
import LinkedInPreview from '@/components/linkedin/LinkedInPreview'

interface BulkImportProps {
  onImport: (posts: { content: string; scheduledAt: string; status: string; images?: string[] }[]) => Promise<void> | void
  onClose: () => void
  isPremium?: boolean
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
// Element detection: hook / hashtags / CTA
// ─────────────────────────────────────────────────────────────

interface PostElements {
  hook: boolean
  hashtags: boolean
  cta: boolean
}

function detectElements(text: string): PostElements {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const firstLine = lines[0] || ''
  const lastThree = lines.slice(-4).join(' ')

  const hook =
    firstLine.length >= 15 &&
    (firstLine.endsWith('?') ||
      firstLine.endsWith('!') ||
      firstLine.length >= 45 ||
      /^(j'|je |vous |on |comment |pourquoi |saviez-|si vous|il y a|chaque|tout |voici|la clé|le secret|stop |\d+\s)/i.test(firstLine))

  const hashtags = /#[a-zA-ZÀ-ÿ0-9_]{2,}/.test(text)

  const cta =
    /\?/.test(lastThree) ||
    /comment(ez)?|dites|partagez|qu'en pensez|et vous|votre avis|réagissez|laissez|rejoignez|découvrez|envoyez|suivez|abonnez|like|liker|taguez|vos pens/i.test(lastThree)

  return { hook, cta, hashtags }
}

function ElementBadge({ ok, label, icon }: { ok: boolean; label: string; icon: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
        ok
          ? 'bg-green-50 text-green-600 border border-green-100'
          : 'bg-orange-50 text-orange-500 border border-orange-100'
      }`}
      title={ok ? `${label} ✓` : `${label} manquant`}
    >
      {icon}
      {label}
      {ok ? <Check className="w-2.5 h-2.5" /> : <span className="text-orange-400">!</span>}
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
  div.querySelectorAll('p, h1, h2, h3, li').forEach(el => {
    el.insertAdjacentText('afterend', '\n')
  })
  div.querySelectorAll('br').forEach(el => el.replaceWith('\n'))
  div.querySelectorAll('img').forEach(el => el.remove())
  let text = (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
  // Strip section headers (ALL CAPS lines) from output
  text = text
    .split('\n')
    .filter(line => {
      const t = line.trim()
      if (!t) return true
      if (t.length >= 3 && t === t.toUpperCase() && /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]{3}/.test(t) && t.length < 60) return false
      if (/^semaine\s+\d+\s*[—\-–]/i.test(t)) return false
      if (/^(jour|day|week|chapitre|partie|section)\s+\d+/i.test(t)) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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
// Smart slot analysis
// ─────────────────────────────────────────────────────────────

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function analyzeSmartSlots(publishedPosts: Array<{ scheduled_at: string; status: string }>): SmartSlot[] {
  const published = publishedPosts.filter(p => p.status === 'published' && p.scheduled_at)
  if (published.length < 3) {
    return [
      { hour: 8, day: 2, dayLabel: 'Mardi', score: 95, label: 'Meilleur créneau LinkedIn (Mardi 8h)' },
      { hour: 9, day: 3, dayLabel: 'Mercredi', score: 90, label: 'Top engagement (Mercredi 9h)' },
      { hour: 12, day: 4, dayLabel: 'Jeudi', score: 85, label: 'Pause déjeuner (Jeudi 12h)' },
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
      const day = Number(dayStr)
      const hour = Number(hourStr)
      return { day, hour, count, score: Math.round((count / maxCount) * 100) }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(s => ({
      hour: s.hour,
      day: s.day,
      dayLabel: DAYS_FR[s.day],
      score: s.score,
      label: `Tes posts publiés à ${s.hour}h le ${DAYS_FR[s.day]}`,
    }))
}

// ─────────────────────────────────────────────────────────────
// API call: extract + split via AI
// ─────────────────────────────────────────────────────────────

async function apiSplit(text: string, filename: string): Promise<{ posts: string[]; structure: string; method: string }> {
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, filename }),
  })
  const raw = await res.text()
  let data: any
  try { data = JSON.parse(raw) } catch { throw new Error(`Réponse serveur invalide (${res.status})`) }
  if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`)
  return {
    posts: data.posts as string[],
    structure: data.structure || '',
    method: data.method || '',
  }
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function BulkImport({
  onImport,
  onClose,
  isPremium = false,
  publishedPosts = [],
  authorAvatar,
  authorName,
}: BulkImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'schedule'>('upload')
  const [posts, setPosts] = useState<string[]>([])
  const [postImages, setPostImages] = useState<Record<number, string[]>>({})
  const [filename, setFilename] = useState('')
  const [structure, setStructure] = useState('')
  const [method, setMethod] = useState('')
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

  // AI Reformulation
  const [aiLoadingIdx, setAiLoadingIdx] = useState<number | null>(null)
  const [aiVariants, setAiVariants] = useState<AIVariant[] | null>(null)
  const [aiModalIdx, setAiModalIdx] = useState<number | null>(null)
  const [aiError, setAiError] = useState('')

  // ── File handling ──────────────────────────────────────────

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')

    try {
      const ext = file.name.toLowerCase().split('.').pop() || ''

      // ── DOCX ──
      if (ext === 'docx' || ext === 'doc') {
        setLoadingMsg('Extraction du document Word…')
        const arrayBuffer = await file.arrayBuffer()
        const mammoth = await import('mammoth')

        // Try HTML extraction to capture images
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
        const html = htmlResult.value

        // Extract images per paragraph block
        const textResult = await mammoth.extractRawText({ arrayBuffer })
        const rawText = textResult.value

        setLoadingMsg('IA analyse la structure du document…')
        const { posts: extracted, structure: s, method: m } = await apiSplit(rawText, file.name)

        // Map images from HTML blocks to posts
        const images: Record<number, string[]> = {}
        if (html.includes('<img')) {
          const allImgs = extractImagesFromHtml(html)
          if (allImgs.length > 0) {
            // Distribute images evenly to posts (rough assignment)
            const perPost = Math.ceil(allImgs.length / extracted.length)
            extracted.forEach((_, i) => {
              const slice = allImgs.slice(i * perPost, (i + 1) * perPost)
              if (slice.length > 0) images[i] = slice
            })
          }
        }

        setPosts(extracted)
        setPostImages(images)
        setFilename(file.name)
        setStructure(s)
        setMethod(m)
        setSelectedPosts(new Set(extracted.map((_, i) => i)))
        setExpandedPosts(new Set())
        setEditingPosts(new Set())
        setEditedContent({})
        setStep('preview')

      // ── PDF (text extraction best-effort) ──
      } else if (ext === 'pdf') {
        setLoadingMsg('Extraction du PDF…')
        // We use FormData + server approach since PDF.js isn't bundled
        // But we can attempt to read as text and let the API handle it
        const text = await file.text().catch(() => '')
        if (!text || text.trim().length < 50) {
          throw new Error('PDF non lisible directement. Copie-colle le contenu dans un fichier .txt ou .docx.')
        }
        setLoadingMsg('IA analyse le document…')
        const { posts: extracted, structure: s, method: m } = await apiSplit(text, file.name)
        setPosts(extracted)
        setPostImages({})
        setFilename(file.name)
        setStructure(s)
        setMethod(m)
        setSelectedPosts(new Set(extracted.map((_, i) => i)))
        setExpandedPosts(new Set())
        setEditingPosts(new Set())
        setEditedContent({})
        setStep('preview')

      // ── TXT / MD / CSV ──
      } else if (['txt', 'md', 'csv', 'rtf'].includes(ext)) {
        setLoadingMsg('Lecture du fichier…')
        const text = await file.text()
        setLoadingMsg('IA analyse le document…')
        const { posts: extracted, structure: s, method: m } = await apiSplit(text, file.name)
        setPosts(extracted)
        setPostImages({})
        setFilename(file.name)
        setStructure(s)
        setMethod(m)
        setSelectedPosts(new Set(extracted.map((_, i) => i)))
        setExpandedPosts(new Set())
        setEditingPosts(new Set())
        setEditedContent({})
        setStep('preview')

      } else {
        throw new Error(`Format "${ext}" non supporté. Utilise .docx, .txt, .md ou .pdf`)
      }

    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import")
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  // ── Post helpers ───────────────────────────────────────────

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

  const getContent = (idx: number): string =>
    idx in editedContent ? editedContent[idx] : posts[idx]

  // ── AI Reformulation ───────────────────────────────────────

  const handleAIReformulate = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isPremium) return
    setAiLoadingIdx(idx)
    setAiError('')
    setAiVariants(null)
    setAiModalIdx(null)
    try {
      const resp = await fetch('/api/ai/reformulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: getContent(idx) }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Erreur IA')
      setAiVariants(data.variants || [])
      setAiModalIdx(idx)
    } catch (err: any) {
      setAiError(err.message || 'Erreur lors de la reformulation IA')
    } finally {
      setAiLoadingIdx(null)
    }
  }

  const applyVariant = (variant: AIVariant) => {
    if (aiModalIdx === null) return
    setEditedContent(prev => ({ ...prev, [aiModalIdx]: variant.content }))
    setEditingPosts(prev => { const s = new Set(prev); s.delete(aiModalIdx); return s })
    setAiModalIdx(null)
    setAiVariants(null)
  }

  // ── Schedule ───────────────────────────────────────────────

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
      const selected = posts.map((_, i) => i).filter(i => selectedPosts.has(i))
      let currentDate = new Date(`${startDate}T${startTime}:00`)
      const scheduled = selected.map((i, n) => {
        if (n > 0) currentDate = getNextDate(currentDate, frequency)
        return {
          content: getContent(i),
          scheduledAt: currentDate.toISOString(),
          status: 'scheduled',
          images: postImages[i] || [],
        }
      })
      await onImport(scheduled)
    } finally {
      setScheduling(false)
    }
  }

  const applySmartSlot = (slot: SmartSlot) => {
    setStartTime(`${String(slot.hour).padStart(2, '0')}:00`)
    const today = new Date()
    const d = new Date(today)
    let diff = slot.day - today.getDay()
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  const smartSlots = analyzeSmartSlots(publishedPosts)

  // ── Computed ───────────────────────────────────────────────

  const structureLabels: Record<string, string> = {
    sections: 'Sections MAJUSCULES',
    paragraphs: 'Paragraphes',
    numbered: 'Liste numérotée',
    mixed: 'Structure mixte',
    'explicit-separators': 'Séparateurs ---',
    single: 'Post unique',
    unknown: 'Structure détectée',
  }

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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">3 variantes générées par IA</h3>
                <p className="text-xs text-gray-400">Clique sur une variante pour l'appliquer au post {(aiModalIdx ?? 0) + 1}</p>
              </div>
            </div>
            <button onClick={() => { setAiModalIdx(null); setAiVariants(null) }} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {aiVariants.map((v, i) => (
              <button
                key={i}
                onClick={() => applyVariant(v)}
                className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-violet-400 hover:bg-violet-50/30 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">{v.format}</span>
                  <span className="text-xs text-gray-400">{v.description}</span>
                  <span className="ml-auto text-xs text-violet-500 opacity-0 group-hover:opacity-100 font-semibold transition-opacity">Appliquer →</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6 leading-relaxed">{v.content}</p>
                <p className="text-xs text-gray-400 mt-2">{v.content.length} caractères</p>
              </button>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">✨ Powered by Claude AI · Reformulation contextuelle LinkedIn</p>
          </div>
        </div>
      </div>
    )}

    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'upload' ? 'Importer des posts' : step === 'preview' ? 'Aperçu des posts' : 'Programmer'}
            </h2>
            <p className="text-sm text-gray-400">
              {step === 'upload'
                ? 'Importe n\'importe quel document — l\'IA s\'adapte'
                : step === 'preview'
                ? `${selectedPosts.size} / ${posts.length} posts sélectionnés`
                : 'Choisis la fréquence et la date de début'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── STEP 1 : Upload ── */}
          {step === 'upload' && (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                  dragOver ? 'border-[#0A66C2] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-[#0A66C2] animate-spin" />
                    <p className="text-sm font-medium text-gray-600">{loadingMsg}</p>
                    <p className="text-xs text-gray-400">L'IA analyse la structure du document…</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-7 h-7 text-[#0A66C2]" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Glisse ton fichier ici</p>
                    <p className="text-xs text-gray-400 mb-4">ou parcours tes fichiers</p>
                    <label className="inline-block px-5 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full cursor-pointer hover:bg-[#004182] transition-colors">
                      Choisir un fichier
                      <input
                        type="file"
                        className="hidden"
                        accept=".docx,.doc,.txt,.md,.csv,.pdf,.rtf"
                        onChange={handleFileInput}
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-4">
                      .docx · .txt · .md · .pdf · .csv · .rtf — Tout format accepté
                    </p>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* How it works */}
              <div className="mt-5 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#0A66C2]" />
                  <h3 className="text-sm font-semibold text-gray-700">Comment ça marche ?</h3>
                </div>
                <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                    <p><strong className="text-gray-600">Importe n'importe quel document</strong> — Word, texte, PDF, CSV</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                    <p><strong className="text-gray-600">L'IA détecte automatiquement</strong> la structure et sépare les posts</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                    <p><strong className="text-gray-600">Chaque post est complété</strong> avec hashtags et CTA si absents</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium">💡 Chaque post doit contenir : Hook · Contenu · Hashtags · CTA</p>
                  <p className="text-xs text-blue-600 mt-1">L'IA vérifie et complète les éléments manquants automatiquement.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 : Preview ── */}
          {step === 'preview' && (
            <div className="space-y-3">
              {/* File info bar */}
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500 truncate max-w-[140px]">{filename}</span>
                {structure && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                    <Zap className="w-3 h-3" />
                    {structureLabels[structure] || structure}
                  </span>
                )}
                {method === 'ai' && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full font-medium">
                    <Sparkles className="w-3 h-3" /> IA
                  </span>
                )}
                <button
                  onClick={() => setSelectedPosts(
                    selectedPosts.size === posts.length ? new Set() : new Set(posts.map((_, i) => i))
                  )}
                  className="ml-auto text-xs text-[#0A66C2] font-medium hover:underline"
                >
                  {selectedPosts.size === posts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {aiError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm border border-red-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {!isPremium && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-xs border border-amber-100">
                  <Star className="w-4 h-4 flex-shrink-0" />
                  <span>Passe en <strong>Premium</strong> pour reformuler chaque post avec l'IA en 1 clic.</span>
                </div>
              )}

              {/* Post list */}
              {posts.map((_, idx) => {
                const content = getContent(idx)
                const isSelected = selectedPosts.has(idx)
                const isExpanded = expandedPosts.has(idx)
                const isEditing = editingPosts.has(idx)
                const isAiLoading = aiLoadingIdx === idx
                const elements = detectElements(content)
                const allGood = elements.hook && elements.hashtags && elements.cta
                const imgs = postImages[idx] || []

                return (
                  <div
                    key={idx}
                    onClick={() => togglePost(idx)}
                    className={`border rounded-xl transition-all cursor-pointer ${
                      isSelected ? 'border-[#0A66C2] bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Post header */}
                    <div className="flex items-start gap-3 p-3">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-[#0A66C2]' : 'border-2 border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-gray-500">Post {idx + 1}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{content.length} car.</span>
                          {imgs.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-blue-500">
                              <ImageIcon className="w-3 h-3" />{imgs.length}
                            </span>
                          )}
                          {/* Element badges */}
                          <div className="flex items-center gap-1 ml-auto">
                            <ElementBadge ok={elements.hook} label="Hook" icon={<Zap className="w-2.5 h-2.5" />} />
                            <ElementBadge ok={elements.hashtags} label="#Tags" icon={<Hash className="w-2.5 h-2.5" />} />
                            <ElementBadge ok={elements.cta} label="CTA" icon={<MessageCircle className="w-2.5 h-2.5" />} />
                          </div>
                        </div>

                        {/* Content preview / edit */}
                        {isEditing ? (
                          <textarea
                            value={idx in editedContent ? editedContent[idx] : content}
                            onChange={e => setEditedContent(prev => ({ ...prev, [idx]: e.target.value }))}
                            onClick={e => e.stopPropagation()}
                            className="w-full text-sm text-gray-700 leading-relaxed border border-[#0A66C2] rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30 bg-white"
                            rows={8}
                          />
                        ) : (
                          <p className={`text-sm text-gray-700 leading-relaxed ${!isExpanded ? 'line-clamp-3' : 'whitespace-pre-wrap'}`}>
                            {content}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => toggleExpand(idx, e)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpanded ? 'Réduire' : 'Voir tout'}
                      </button>

                      {isEditing ? (
                        <>
                          <button
                            onClick={e => saveEdit(idx, e)}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 font-medium"
                          >
                            <Check className="w-3 h-3" /> Sauvegarder
                          </button>
                          <button
                            onClick={e => cancelEdit(idx, e)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                          >
                            <X className="w-3 h-3" /> Annuler
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={e => startEdit(idx, e)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          <Pencil className="w-3 h-3" /> Éditer
                        </button>
                      )}

                      <button
                        onClick={e => { e.stopPropagation(); setPreviewIdx(idx) }}
                        className="flex items-center gap-1 text-xs text-[#0A66C2] hover:text-[#004182] px-2 py-1 rounded hover:bg-blue-50"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                        Aperçu
                      </button>

                      {isPremium && (
                        <button
                          onClick={e => handleAIReformulate(idx, e)}
                          disabled={isAiLoading}
                          className="ml-auto flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 px-2 py-1 rounded hover:bg-violet-50 font-medium disabled:opacity-50"
                        >
                          {isAiLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          Reformuler
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── STEP 3 : Schedule ── */}
          {step === 'schedule' && (
            <div className="space-y-5">
              {/* Smart Slots */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-gray-700">Créneaux optimaux LinkedIn</h3>
                </div>
                <div className="space-y-2">
                  {smartSlots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => applySmartSlot(slot)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#0A66C2] hover:bg-blue-50/30 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#0A66C2]/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-[#0A66C2]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{slot.dayLabel} à {slot.hour}h</p>
                        <p className="text-xs text-gray-400 truncate">{slot.label}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0A66C2] rounded-full" style={{ width: `${slot.score}%` }} />
                        </div>
                        <span className="text-xs font-bold text-[#0A66C2]">{slot.score}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date de début</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30 focus:border-[#0A66C2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Heure</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30 focus:border-[#0A66C2]"
                  />
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Fréquence de publication</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'daily', label: 'Chaque jour', sub: '7×/sem.' },
                    { value: '3x_week', label: '3× par semaine', sub: 'Lun · Mer · Ven' },
                    { value: 'weekdays', label: 'Jours ouvrés', sub: 'Lun → Ven' },
                    { value: 'weekly', label: 'Hebdo', sub: '1×/sem.' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFrequency(opt.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        frequency === opt.value
                          ? 'border-[#0A66C2] bg-blue-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${frequency === opt.value ? 'text-[#0A66C2]' : 'text-gray-700'}`}>{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>{selectedPosts.size} posts</strong> programmés à partir du{' '}
                  <strong>{new Date(`${startDate}T${startTime}`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong>{' '}
                  à <strong>{startTime}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {step === 'upload' ? (
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
          ) : (
            <button
              onClick={() => setStep(step === 'schedule' ? 'preview' : 'upload')}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50"
            >
              ← Retour
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={() => setStep('schedule')}
              disabled={selectedPosts.size === 0}
              className="px-5 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Programmer {selectedPosts.size > 0 ? `${selectedPosts.size} post${selectedPosts.size > 1 ? 's' : ''}` : ''} →
            </button>
          )}

          {step === 'schedule' && (
            <button
              onClick={handleSchedule}
              disabled={scheduling || selectedPosts.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {scheduling ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Programmation…</>
              ) : (
                <><Calendar className="w-4 h-4" /> Confirmer la programmation</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
