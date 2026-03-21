'use client'

import { useState } from 'react'
import {
  Upload, FileText, Calendar, Check, X, Loader2,
  Pencil, ChevronDown, ChevronUp, Image as ImageIcon,
  Linkedin, Sparkles, Clock, Star, RefreshCw, AlertCircle
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

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

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
// Helpers HTML
// ─────────────────────────────────────────────────────────────

function splitHtmlIntoPosts(html: string): string[] {
  if (typeof window === 'undefined') return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const children = Array.from(doc.body.children)

  const isHeader = (el: Element): boolean => {
    const text = (el.textContent || '').trim()
    return (
      text.length >= 4 &&
      text === text.toUpperCase() &&
      /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]/.test(text) &&
      !el.querySelector('img')
    )
  }

  const posts: string[] = []
  let current = ''

  for (const el of children) {
    if (isHeader(el) && current.trim().length > 0) {
      if (current.replace(/<[^>]+>/g, '').trim().length > 80) posts.push(current)
      current = el.outerHTML
    } else {
      current += el.outerHTML
    }
  }
  if (current.replace(/<[^>]+>/g, '').trim().length > 80) posts.push(current)

  return posts.filter(p => {
    const d = parser.parseFromString(p, 'text/html')
    const first = d.body.firstElementChild
    if (!first) return false
    const t = (first.textContent || '').trim()
    return t.length >= 4 && t === t.toUpperCase() && /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]/.test(t)
  })
}

function stripDocxHeaders(text: string): string {
  return text
    .split('\n')
    .filter(line => {
      const t = line.trim()
      if (!t) return true
      if (t.length >= 3 && t === t.toUpperCase() && /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]{3,}/.test(t)) return false
      if (/^Semaine\s+\d+\s*[—–-]/i.test(t)) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function htmlToText(html: string): string {
  if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, '')
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('p, h1, h2, h3').forEach(el => {
    el.insertAdjacentText('afterend', '\n')
  })
  div.querySelectorAll('br').forEach(el => el.replaceWith('\n'))
  div.querySelectorAll('img').forEach(el => el.remove())
  return stripDocxHeaders((div.textContent || '').replace(/\n{3,}/g, '\n\n').trim())
}

function countImages(html: string): number {
  return (html.match(/<img/g) || []).length
}

function extractImagesFromHtml(html: string): string[] {
  if (typeof window === 'undefined') return []
  const div = document.createElement('div')
  div.innerHTML = html
  const imgs: string[] = []
  div.querySelectorAll('img').forEach(el => {
    const src = el.getAttribute('src')
    if (!src) return
    const isDataImage = src.startsWith('data:image/')
    const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(src)
    const isHttpImage = src.startsWith('http') &&
      !/\.(pdf|doc|docx|xls|xlsx|zip|rar|ppt|pptx|txt|xml)(\?.*)?$/i.test(src)
    if (isDataImage || isImageUrl || isHttpImage) imgs.push(src)
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
    // Default slots based on LinkedIn best practices
    return [
      { hour: 8, day: 2, dayLabel: 'Mardi', score: 95, label: 'Meilleur créneau LinkedIn (Mardi 8h)' },
      { hour: 9, day: 3, dayLabel: 'Mercredi', score: 90, label: 'Top engagement (Mercredi 9h)' },
      { hour: 12, day: 4, dayLabel: 'Jeudi', score: 85, label: 'Pause déjeuner (Jeudi 12h)' },
    ]
  }

  // Build a heatmap: day × hour → count
  const heatmap: Record<string, number> = {}
  for (const p of published) {
    const d = new Date(p.scheduled_at)
    const key = `${d.getDay()}_${d.getHours()}`
    heatmap[key] = (heatmap[key] || 0) + 1
  }

  const maxCount = Math.max(...Object.values(heatmap), 1)

  // Sort entries by count descending
  const sorted = Object.entries(heatmap)
    .map(([key, count]) => {
      const [dayStr, hourStr] = key.split('_')
      const day = Number(dayStr)
      const hour = Number(hourStr)
      return { day, hour, count, score: Math.round((count / maxCount) * 100) }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return sorted.map(s => ({
    hour: s.hour,
    day: s.day,
    dayLabel: DAYS_FR[s.day],
    score: s.score,
    label: `Tes posts publiés à ${s.hour}h le ${DAYS_FR[s.day]}`,
  }))
}

// ─────────────────────────────────────────────────────────────
// Server split fallback
// ─────────────────────────────────────────────────────────────

async function serverSplit(text: string, filename: string): Promise<string[]> {
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, filename }),
  })
  const raw = await res.text()
  let data: any
  try { data = JSON.parse(raw) } catch { throw new Error(`Erreur serveur (${res.status})`) }
  if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`)
  return data.posts as string[]
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function BulkImport({ onImport, onClose, isPremium = false, publishedPosts = [], authorAvatar, authorName }: BulkImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'schedule'>('upload')
  const [posts, setPosts] = useState<string[]>([])
  const [isHtml, setIsHtml] = useState(false)
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set())
  const [frequency, setFrequency] = useState<'daily' | '3x_week' | 'weekdays' | 'weekly'>('3x_week')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('08:00')
  const [dragOver, setDragOver] = useState(false)

  // Per-post state
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set())
  const [editingPosts, setEditingPosts] = useState<Set<number>>(new Set())
  const [editedContent, setEditedContent] = useState<Record<number, string>>({})
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const [scheduling, setScheduling] = useState(false)

  // AI Reformulation state
  const [aiLoadingIdx, setAiLoadingIdx] = useState<number | null>(null)
  const [aiVariants, setAiVariants] = useState<AIVariant[] | null>(null)
  const [aiModalIdx, setAiModalIdx] = useState<number | null>(null)
  const [aiError, setAiError] = useState('')

  // ── File handling ──────────────────────────────────────────

  const handleFileFixed = async (file: File) => {
    setLoading(true)
    setError('')
    let resolvedPosts: string[] = []
    let resolvedIsHtml = false

    try {
      if (file.name.toLowerCase().match(/\.docx?$/)) {
        setLoadingMsg('Extraction du texte et des images…')
        const arrayBuffer = await file.arrayBuffer()
        const mammoth = await import('mammoth')
        const result = await mammoth.convertToHtml({ arrayBuffer })
        const html = result.value

        setLoadingMsg('Découpage intelligent des posts…')
        let htmlPosts = splitHtmlIntoPosts(html)

        if (htmlPosts.length > 0) {
          resolvedPosts = htmlPosts
          resolvedIsHtml = true
        } else {
          setLoadingMsg('Analyse de la structure…')
          const textResult = await mammoth.extractRawText({ arrayBuffer })
          const serverPosts = await serverSplit(textResult.value, file.name)
          resolvedPosts = serverPosts
          resolvedIsHtml = false
        }
      } else if (file.name.toLowerCase().match(/\.(txt|md|csv)$/)) {
        setLoadingMsg('Lecture du fichier…')
        const text = await file.text()
        setLoadingMsg('Détection des posts…')
        resolvedPosts = await serverSplit(text, file.name)
        resolvedIsHtml = false
      } else {
        throw new Error('Format non supporté. Utilisez .docx, .txt ou .md')
      }

      setPosts(resolvedPosts)
      setIsHtml(resolvedIsHtml)
      setFilename(file.name)
      setSelectedPosts(new Set(resolvedPosts.map((_, i) => i)))
      setExpandedPosts(new Set())
      setEditingPosts(new Set())
      setEditedContent({})
      setStep('preview')

    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import")
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileFixed(file)
  }
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileFixed(file)
  }

  // ── Post actions ───────────────────────────────────────────

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
    if (!(idx in editedContent)) {
      const raw = posts[idx]
      setEditedContent(prev => ({ ...prev, [idx]: isHtml ? htmlToText(raw) : raw }))
    }
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

  const getDisplayContent = (idx: number) =>
    idx in editedContent ? editedContent[idx] : posts[idx]

  const getTextContent = (idx: number) => {
    const c = getDisplayContent(idx)
    if (idx in editedContent) return c
    return isHtml ? htmlToText(c) : c
  }

  // ── AI Reformulation ───────────────────────────────────────

  const handleAIReformulate = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isPremium) return
    setAiLoadingIdx(idx)
    setAiError('')
    setAiVariants(null)
    setAiModalIdx(null)

    try {
      const content = getTextContent(idx)
      const resp = await fetch('/api/ai/reformulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
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
        const images = isHtml && !(i in editedContent) ? extractImagesFromHtml(posts[i]) : []
        return {
          content: getTextContent(i),
          scheduledAt: currentDate.toISOString(),
          status: 'scheduled',
          images,
        }
      })
      await onImport(scheduled)
    } finally {
      setScheduling(false)
    }
  }

  const applySmartSlot = (slot: SmartSlot) => {
    setStartTime(`${String(slot.hour).padStart(2, '0')}:00`)
    // Find next occurrence of that day
    const today = new Date()
    const d = new Date(today)
    let diff = slot.day - today.getDay()
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  const totalImages = isHtml
    ? [...selectedPosts].reduce((sum, i) => {
        if (i in editedContent) return sum
        return sum + extractImagesFromHtml(posts[i]).length
      }, 0)
    : 0

  const smartSlots = analyzeSmartSlots(publishedPosts)

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <>
    {/* LinkedIn Preview */}
    {previewIdx !== null && (
      <LinkedInPreview
        content={getTextContent(previewIdx)}
        images={isHtml && !(previewIdx in editedContent) ? extractImagesFromHtml(posts[previewIdx]) : []}
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
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#0A66C2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">3 variantes générées par IA</h3>
                <p className="text-xs text-gray-400">Clique sur une variante pour l'appliquer au post {aiModalIdx + 1}</p>
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
                className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-[#0A66C2] hover:bg-blue-50/30 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-[#004182] text-xs font-bold rounded-full">{v.format}</span>
                  <span className="text-xs text-gray-400">{v.description}</span>
                  <span className="ml-auto text-xs text-[#0A66C2] opacity-0 group-hover:opacity-100 font-semibold transition-opacity">Appliquer →</span>
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
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'upload' ? 'Importer des posts' : step === 'preview' ? 'Aperçu des posts' : 'Programmer'}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {step === 'upload'
                ? 'Glisse un fichier Word ou texte avec tes posts'
                : step === 'preview'
                ? `${selectedPosts.size} / ${posts.length} posts sélectionnés`
                : 'Choisis la fréquence et la date de début'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* ── STEP 1 : Upload ── */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-16 text-center transition-colors ${
                  dragOver ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin" />
                    <p className="text-sm text-gray-500 mt-1">{loadingMsg}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-300 mx-auto mb-5" />
                    <p className="text-base text-gray-600 mb-1 font-medium">Glisse ton fichier ici</p>
                    <p className="text-sm text-gray-400 mb-5">ou parcours tes fichiers</p>
                    <label className="inline-block px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-full cursor-pointer hover:bg-[var(--primary-dark)] transition-colors">
                      Choisir un fichier
                      <input type="file" className="hidden" accept=".docx,.doc,.txt,.md,.csv" onChange={handleFileInput} />
                    </label>
                    <p className="text-xs text-gray-400 mt-5">Formats supportés : .docx, .txt, .md — Images intégrées automatiquement</p>
                  </>
                )}
              </div>

              {error && <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}

              <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Comment formater ton fichier ?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Les fichiers Word (.docx) sont analysés automatiquement — images incluses.
                  Pour les fichiers texte, sépare chaque post avec <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">---</code> ou une ligne vide.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2 : Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-5">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{filename}</span>
                {isHtml && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                    <ImageIcon className="w-3 h-3" /> images incluses
                  </span>
                )}
                {isPremium && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-[#0A66C2] rounded-full font-medium">
                    <Sparkles className="w-3 h-3" /> IA disponible
                  </span>
                )}
                <button
                  onClick={() => setSelectedPosts(
                    selectedPosts.size === posts.length ? new Set() : new Set(posts.map((_, i) => i))
                  )}
                  className="ml-auto text-xs text-[var(--primary)] font-medium hover:underline"
                >
                  {selectedPosts.size === posts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {aiError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {!isPremium && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <Sparkles className="w-4 h-4 text-[#0A66C2] flex-shrink-0" />
                  <p className="text-sm text-[#004182]">
                    <strong>Feature Premium :</strong> Reformulation IA contextuelle — 3 variantes optimisées LinkedIn par post (Storytelling, Liste, Hook+CTA)
                  </p>
                </div>
              )}

              {posts.map((_, idx) => {
                const isSelected = selectedPosts.has(idx)
                const isExpanded = expandedPosts.has(idx)
                const isEditing = editingPosts.has(idx)
                const isModified = idx in editedContent
                const isAiLoading = aiLoadingIdx === idx
                const displayContent = getDisplayContent(idx)
                const imgCount = isHtml && !isModified ? countImages(displayContent) : 0
                const textLen = isModified ? displayContent.length : htmlToText(displayContent).length

                return (
                  <div
                    key={idx}
                    onClick={() => !isEditing && togglePost(idx)}
                    className={`rounded-xl border transition-all ${
                      isEditing
                        ? 'border-amber-400 bg-amber-50/30 cursor-default'
                        : isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary-light)]/20 cursor-pointer hover:bg-[var(--primary-light)]/30'
                        : 'border-gray-200 opacity-60 cursor-pointer hover:opacity-80'
                    }`}
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-3 p-5 pb-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isEditing ? 'border-2 border-amber-400 bg-white'
                            : isSelected ? 'bg-[var(--primary)] text-white'
                            : 'border-2 border-gray-300'
                        }`}
                        onClick={e => { e.stopPropagation(); if (!isEditing) togglePost(idx) }}
                      >
                        {isSelected && !isEditing && <Check className="w-3 h-3" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-medium text-gray-400">Post {idx + 1}</span>
                          {isModified && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">modifié</span>
                          )}
                          {imgCount > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-blue-500">
                              <ImageIcon className="w-3 h-3" />{imgCount}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">{textLen} car.</span>
                        </div>

                        {isEditing ? (
                          <textarea
                            value={editedContent[idx] ?? ''}
                            onChange={e => setEditedContent(prev => ({ ...prev, [idx]: e.target.value }))}
                            onClick={e => e.stopPropagation()}
                            className="w-full text-sm text-gray-700 border border-amber-300 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-mono"
                            rows={12}
                            autoFocus
                          />
                        ) : isHtml && !isModified ? (
                          <div
                            className={`post-html-content text-sm text-gray-700 ${!isExpanded ? 'max-h-24 overflow-hidden' : ''}`}
                            style={{ maskImage: !isExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
                                     WebkitMaskImage: !isExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none' }}
                            dangerouslySetInnerHTML={{ __html: displayContent }}
                          />
                        ) : (
                          <p className={`text-sm text-gray-700 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            {displayContent}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action bar */}
                    <div className="flex items-center gap-1.5 px-5 pb-4 pt-1" onClick={e => e.stopPropagation()}>
                      {isEditing ? (
                        <>
                          <button onClick={e => saveEdit(idx, e)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--primary-dark)] transition-colors">
                            <Check className="w-3 h-3" /> Enregistrer
                          </button>
                          <button onClick={e => cancelEdit(idx, e)}
                            className="flex items-center gap-1.5 px-4 py-2 text-gray-500 text-xs hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="w-3 h-3" /> Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          {/* AI Reformulate Button */}
                          {isPremium ? (
                            <button
                              onClick={e => handleAIReformulate(idx, e)}
                              disabled={isAiLoading}
                              className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-[#0A66C2] text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                              title="Reformulation IA — 3 variantes LinkedIn"
                            >
                              {isAiLoading ? (
                                <><Loader2 className="w-3 h-3 animate-spin" />IA…</>
                              ) : (
                                <><Sparkles className="w-3 h-3" />Reformuler</>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-400 text-xs rounded-lg cursor-not-allowed"
                              title="Disponible en plan Premium"
                            >
                              <Sparkles className="w-3 h-3" />Premium
                            </button>
                          )}
                          <button onClick={e => startEdit(idx, e)}
                            className="flex items-center gap-1.5 px-4 py-2 text-gray-500 text-xs hover:text-[var(--primary)] hover:bg-[var(--primary-light)]/30 rounded-lg transition-colors">
                            <Pencil className="w-3 h-3" /> Modifier
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setPreviewIdx(idx) }}
                            className="flex items-center gap-1.5 px-4 py-2 text-[#0a66c2] text-xs hover:bg-blue-50 rounded-lg transition-colors font-medium">
                            <Linkedin className="w-3 h-3" /> Aperçu
                          </button>
                          <button onClick={e => toggleExpand(idx, e)}
                            className="flex items-center gap-1.5 px-4 py-2 text-gray-500 text-xs hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-auto">
                            {isExpanded ? <><ChevronUp className="w-3 h-3" />Réduire</> : <><ChevronDown className="w-3 h-3" />Voir tout</>}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── STEP 3 : Schedule ── */}
          {step === 'schedule' && (
            <div className="space-y-8">

              {/* Smart slots (premium) */}
              {isPremium && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-[#0A66C2]" />
                    <h3 className="text-sm font-semibold text-gray-800">
                      {publishedPosts.filter(p => p.status === 'published').length >= 3
                        ? '🎯 Meilleurs créneaux basés sur tes données'
                        : '💡 Créneaux LinkedIn recommandés'}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {smartSlots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => applySmartSlot(slot)}
                        className="p-4 rounded-xl border-2 border-blue-100 bg-blue-50/50 hover:border-[#0A66C2] hover:bg-blue-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <Star className={`w-3.5 h-3.5 ${i === 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                          <span className="text-xs font-bold text-gray-700">{slot.dayLabel} {slot.hour}h</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                          <div
                            className="h-1.5 rounded-full bg-[#0A66C2] transition-all"
                            style={{ width: `${slot.score}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-500 leading-tight truncate">{slot.label}</p>
                        <p className="text-[11px] text-[#0A66C2] opacity-0 group-hover:opacity-100 transition-opacity font-semibold mt-1">Appliquer →</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isPremium && (
                <div className="flex items-center gap-4 p-5 bg-blue-50 rounded-xl border border-blue-100">
                  <Clock className="w-5 h-5 text-[#0A66C2] flex-shrink-0" />
                  <p className="text-sm text-[#004182]">
                    <strong>Créneaux intelligents Premium :</strong> Détection automatique des meilleurs horaires basée sur l&apos;analyse de tes posts publiés.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Fréquence de publication</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'daily' as const, label: 'Quotidien', desc: '1 post/jour' },
                    { id: '3x_week' as const, label: '3x / semaine', desc: 'Lun, Mer, Ven' },
                    { id: 'weekdays' as const, label: 'Jours ouvrés', desc: 'Lun – Ven' },
                    { id: 'weekly' as const, label: 'Hebdomadaire', desc: '1 post/semaine' },
                  ].map(f => (
                    <button key={f.id} onClick={() => setFrequency(f.id)}
                      className={`px-5 py-4 rounded-xl border text-left transition-all ${
                        frequency === f.id ? 'border-[var(--primary)] bg-[var(--primary-light)]/30' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Date de début</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Heure</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent" />
                </div>
              </div>

              <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-[var(--primary)]" />
                  <span className="text-sm font-semibold text-[var(--primary)]">Résumé</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedPosts.size} posts programmés{' '}
                  {frequency === 'daily' ? 'tous les jours'
                    : frequency === '3x_week' ? '3x par semaine (Lun, Mer, Ven)'
                    : frequency === 'weekdays' ? 'du lundi au vendredi'
                    : 'chaque semaine'}{' '}
                  à partir du{' '}
                  {new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
                  à {startTime}.
                </p>
                {totalImages > 0 && (
                  <p className="text-sm text-blue-600 mt-2 font-medium">
                    🖼 {totalImages} image{totalImages > 1 ? 's' : ''} détectée{totalImages > 1 ? 's' : ''} — elles seront uploadées et incluses dans les posts LinkedIn.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          {step !== 'upload' && (
            <button onClick={() => setStep(step === 'schedule' ? 'preview' : 'upload')}
              className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Retour
            </button>
          )}
          <div className="ml-auto">
            {step === 'preview' && (
              <button onClick={() => setStep('schedule')} disabled={selectedPosts.size === 0}
                className="px-7 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-40">
                Programmer ({selectedPosts.size} posts)
              </button>
            )}
            {step === 'schedule' && (
              <button onClick={handleSchedule} disabled={scheduling}
                className="flex items-center gap-2 px-7 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-60">
                {scheduling ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{totalImages > 0 ? `Upload images (${totalImages})…` : 'Programmation…'}</>
                ) : (
                  'Confirmer et programmer'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
