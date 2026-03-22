'use client'

import { useState } from 'react'
import {
  Upload, FileText, Calendar, Check, X, Loader2,
  Pencil, ChevronDown, ChevronUp, Image as ImageIcon,
  Linkedin, Sparkles, Clock, Star, RefreshCw, AlertCircle,
  ArrowRight, Zap
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

  // Steps config
  const steps = [
    { id: 'upload', label: 'Import', num: 1 },
    { id: 'preview', label: 'Sélection', num: 2 },
    { id: 'schedule', label: 'Programmer', num: 3 },
  ]
  const currentStepIdx = steps.findIndex(s => s.id === step)

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
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#0A66C2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">3 variantes générées par IA</h3>
                <p className="text-xs text-gray-400 mt-0.5">Clique pour appliquer au post {(aiModalIdx ?? 0) + 1}</p>
              </div>
            </div>
            <button onClick={() => { setAiModalIdx(null); setAiVariants(null) }} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {aiVariants.map((v, i) => (
              <button
                key={i}
                onClick={() => applyVariant(v)}
                className="w-full text-left p-5 rounded-xl border-2 border-gray-100 hover:border-[#0A66C2] hover:bg-blue-50/20 transition-all group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-blue-50 text-[#004182] text-xs font-bold rounded-full border border-blue-100">{v.format}</span>
                  <span className="text-xs text-gray-400">{v.description}</span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-[#0A66C2] opacity-0 group-hover:opacity-100 font-semibold transition-opacity">Appliquer <ArrowRight className="w-3 h-3" /></span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6 leading-relaxed">{v.content}</p>
                <p className="text-xs text-gray-400 mt-3 border-t border-gray-100 pt-2">{v.content.length} caractères</p>
              </button>
            ))}
          </div>
          <div className="px-7 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-400 text-center">✨ Powered by Claude AI · Reformulation contextuelle LinkedIn</p>
          </div>
        </div>
      </div>
    )}

    {/* ── MAIN MODAL ── */}
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── TOP BAR : title + close ── */}
        <div className="flex items-center justify-between px-8 pt-6 pb-0 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Import de posts en masse</h2>
              <p className="text-xs text-gray-400">Depuis un fichier Word ou texte</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── STEP INDICATOR ── */}
        <div className="flex items-center gap-0 px-8 pt-5 pb-5 flex-shrink-0">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < currentStepIdx
                    ? 'bg-[#0A66C2] text-white'
                    : i === currentStepIdx
                    ? 'bg-[#0A66C2] text-white ring-4 ring-blue-100'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {i < currentStepIdx ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className={`text-xs font-semibold ${i === currentStepIdx ? 'text-[#0A66C2]' : i < currentStepIdx ? 'text-gray-500' : 'text-gray-300'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-3 transition-all ${i < currentStepIdx ? 'bg-[#0A66C2]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── DIVIDER ── */}
        <div className="h-px bg-gray-100 flex-shrink-0" />

        {/* ── CONTENT ── */}
        <div className="flex-1 overflow-y-auto px-8 py-7">

          {/* ── STEP 1 : Upload ── */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drag & drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                  dragOver
                    ? 'border-[#0A66C2] bg-blue-50/60'
                    : 'border-gray-200 hover:border-[#0A66C2]/50 hover:bg-gray-50/50'
                }`}
              >
                <label className="block p-14 cursor-pointer">
                  <input type="file" className="hidden" accept=".docx,.doc,.txt,.md,.csv" onChange={handleFileInput} />
                  {loading ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[#0A66C2] animate-spin" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{loadingMsg}</p>
                        <p className="text-xs text-gray-400 mt-1">Merci de patienter…</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? 'bg-[#0A66C2]' : 'bg-gray-100'}`}>
                        <Upload className={`w-7 h-7 transition-colors ${dragOver ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-800">Glisse ton fichier ici</p>
                        <p className="text-sm text-gray-400 mt-1">ou clique pour parcourir tes fichiers</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {['.docx', '.txt', '.md'].map(ext => (
                          <span key={ext} className="px-2.5 py-1 bg-white border border-gray-200 text-xs text-gray-500 rounded-full font-medium shadow-sm">{ext}</span>
                        ))}
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-100 text-xs text-[#0A66C2] rounded-full font-medium">Images auto</span>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* How-to section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Fichier Word .docx</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Analysé automatiquement. Les images sont extraites et incluses dans chaque post LinkedIn.
                  </p>
                </div>
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Fichier texte .txt / .md</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Sépare chaque post avec <code className="bg-gray-200 px-1.5 py-0.5 rounded font-mono">---</code> ou une ligne vide entre les sections.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 : Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* File info + controls bar */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{filename}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400">{posts.length} posts détectés</span>
                    {isHtml && (
                      <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                        <ImageIcon className="w-2.5 h-2.5" /> images
                      </span>
                    )}
                    {isPremium && (
                      <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-blue-50 text-[#0A66C2] rounded-full font-medium">
                        <Sparkles className="w-2.5 h-2.5" /> IA
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPosts(
                    selectedPosts.size === posts.length ? new Set() : new Set(posts.map((_, i) => i))
                  )}
                  className="text-xs text-[#0A66C2] font-semibold hover:underline flex-shrink-0 px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {selectedPosts.size === posts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {aiError && (
                <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-red-600 text-sm border border-red-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {!isPremium && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-50/30 rounded-xl border border-blue-100">
                  <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-[#0A66C2]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#004182]">Reformulation IA — Feature Premium</p>
                    <p className="text-xs text-[#0A66C2]/80 mt-0.5">3 variantes optimisées LinkedIn par post : Storytelling, Liste à valeur, Hook+CTA</p>
                  </div>
                </div>
              )}

              {/* Post cards */}
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
                    className={`rounded-xl border-2 transition-all overflow-hidden ${
                      isEditing
                        ? 'border-amber-300 cursor-default'
                        : isSelected
                        ? 'border-[#0A66C2] shadow-sm cursor-pointer'
                        : 'border-gray-200 opacity-50 cursor-pointer hover:opacity-75 hover:border-gray-300'
                    }`}
                  >
                    {/* Card top stripe */}
                    {isSelected && !isEditing && (
                      <div className="h-0.5 bg-[#0A66C2] w-full" />
                    )}

                    {/* Card header */}
                    <div className="flex items-start gap-3 px-5 pt-4 pb-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all ${
                          isEditing ? 'border-amber-400 bg-white'
                            : isSelected ? 'bg-[#0A66C2] border-[#0A66C2]'
                            : 'border-gray-300 bg-white'
                        }`}
                        onClick={e => { e.stopPropagation(); if (!isEditing) togglePost(idx) }}
                      >
                        {isSelected && !isEditing && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Post {idx + 1}</span>
                          {isModified && (
                            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-medium border border-amber-200">modifié</span>
                          )}
                          {imgCount > 0 && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">
                              <ImageIcon className="w-2.5 h-2.5" />{imgCount} img
                            </span>
                          )}
                          <span className="text-xs text-gray-300 ml-auto">{textLen} car.</span>
                        </div>

                        {isEditing ? (
                          <textarea
                            value={editedContent[idx] ?? ''}
                            onChange={e => setEditedContent(prev => ({ ...prev, [idx]: e.target.value }))}
                            onClick={e => e.stopPropagation()}
                            className="w-full text-sm text-gray-700 border border-amber-300 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/20 font-mono leading-relaxed"
                            rows={10}
                            autoFocus
                          />
                        ) : isHtml && !isModified ? (
                          <div
                            className={`post-html-content text-sm text-gray-700 leading-relaxed ${!isExpanded ? 'max-h-20 overflow-hidden' : ''}`}
                            style={{
                              maskImage: !isExpanded ? 'linear-gradient(to bottom, black 50%, transparent 100%)' : 'none',
                              WebkitMaskImage: !isExpanded ? 'linear-gradient(to bottom, black 50%, transparent 100%)' : 'none'
                            }}
                            dangerouslySetInnerHTML={{ __html: displayContent }}
                          />
                        ) : (
                          <p className={`text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            {displayContent}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action bar */}
                    <div className="flex items-center gap-1 px-4 py-3 border-t border-gray-100 bg-gray-50/50" onClick={e => e.stopPropagation()}>
                      {isEditing ? (
                        <>
                          <button onClick={e => saveEdit(idx, e)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#0A66C2] text-white text-xs font-semibold rounded-full hover:bg-[#004182] transition-colors">
                            <Check className="w-3 h-3" /> Enregistrer
                          </button>
                          <button onClick={e => cancelEdit(idx, e)}
                            className="flex items-center gap-1.5 px-4 py-2 text-gray-500 text-xs hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="w-3 h-3" /> Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          {isPremium ? (
                            <button
                              onClick={e => handleAIReformulate(idx, e)}
                              disabled={isAiLoading}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0A66C2]/10 text-[#0A66C2] text-xs font-semibold rounded-full hover:bg-[#0A66C2]/20 transition-colors disabled:opacity-50"
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
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 text-gray-400 text-xs rounded-full cursor-not-allowed"
                              title="Disponible en plan Premium"
                            >
                              <Sparkles className="w-3 h-3" />Premium
                            </button>
                          )}
                          <button onClick={e => startEdit(idx, e)}
                            className="flex items-center gap-1.5 px-3.5 py-2 text-gray-500 text-xs hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors">
                            <Pencil className="w-3 h-3" /> Modifier
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setPreviewIdx(idx) }}
                            className="flex items-center gap-1.5 px-3.5 py-2 text-[#0A66C2] text-xs hover:bg-blue-50 rounded-full transition-colors font-medium">
                            <Linkedin className="w-3 h-3" /> Aperçu LI
                          </button>
                          <button onClick={e => toggleExpand(idx, e)}
                            className="flex items-center gap-1.5 px-3.5 py-2 text-gray-400 text-xs hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors ml-auto">
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
            <div className="space-y-7">

              {/* Smart slots */}
              {isPremium && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      {publishedPosts.filter(p => p.status === 'published').length >= 3
                        ? 'Créneaux basés sur tes données'
                        : 'Créneaux LinkedIn recommandés'}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {smartSlots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => applySmartSlot(slot)}
                        className="p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-[#0A66C2] hover:shadow-sm transition-all text-left group"
                      >
                        <div className="flex items-center gap-1.5 mb-3">
                          <Star className={`w-3.5 h-3.5 ${i === 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
                          <span className="text-sm font-bold text-gray-800">{slot.dayLabel} {slot.hour}h</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                          <div className="h-1.5 rounded-full bg-[#0A66C2]" style={{ width: `${slot.score}%` }} />
                        </div>
                        <p className="text-[11px] text-gray-400 leading-tight truncate">{slot.label}</p>
                        <p className="text-[11px] text-[#0A66C2] opacity-0 group-hover:opacity-100 transition-opacity font-semibold mt-2 flex items-center gap-1">Appliquer <ArrowRight className="w-2.5 h-2.5" /></p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isPremium && (
                <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-blue-50 to-blue-50/20 rounded-xl border border-blue-100">
                  <div className="w-9 h-9 rounded-xl bg-[#0A66C2]/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-[#0A66C2]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#004182]">Créneaux intelligents — Premium</p>
                    <p className="text-xs text-[#0A66C2]/70 mt-0.5">Détection automatique des meilleurs horaires basée sur tes posts publiés.</p>
                  </div>
                </div>
              )}

              {/* Frequency */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Fréquence de publication</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'daily' as const, label: 'Quotidien', desc: '1 post / jour' },
                    { id: '3x_week' as const, label: '3× / semaine', desc: 'Lun, Mer, Ven' },
                    { id: 'weekdays' as const, label: 'Jours ouvrés', desc: 'Lun – Ven' },
                    { id: 'weekly' as const, label: 'Hebdomadaire', desc: '1 post / semaine' },
                  ].map(f => (
                    <button key={f.id} onClick={() => setFrequency(f.id)}
                      className={`px-5 py-4 rounded-xl border-2 text-left transition-all ${
                        frequency === f.id
                          ? 'border-[#0A66C2] bg-blue-50/40'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}>
                      <p className={`text-sm font-bold ${frequency === f.id ? 'text-[#0A66C2]' : 'text-gray-800'}`}>{f.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date de début</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-0 focus:border-[#0A66C2] transition-colors bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Heure de publication</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-0 focus:border-[#0A66C2] transition-colors bg-white" />
                </div>
              </div>

              {/* Summary */}
              <div className="p-5 bg-[#0A66C2]/5 rounded-xl border border-[#0A66C2]/15">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-[#0A66C2]" />
                  <span className="text-sm font-bold text-[#0A66C2]">Résumé de programmation</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong className="text-gray-900">{selectedPosts.size} posts</strong> programmés{' '}
                  {frequency === 'daily' ? 'tous les jours'
                    : frequency === '3x_week' ? '3× par semaine (Lun, Mer, Ven)'
                    : frequency === 'weekdays' ? 'du lundi au vendredi'
                    : 'chaque semaine'}{' '}
                  à partir du{' '}
                  <strong className="text-gray-900">
                    {new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </strong>{' '}
                  à <strong className="text-gray-900">{startTime}</strong>.
                </p>
                {totalImages > 0 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#0A66C2]/10">
                    <ImageIcon className="w-4 h-4 text-[#0A66C2]" />
                    <p className="text-sm text-[#0A66C2] font-medium">
                      {totalImages} image{totalImages > 1 ? 's' : ''} détectée{totalImages > 1 ? 's' : ''} — uploadées automatiquement dans LinkedIn.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="h-px bg-gray-100 flex-shrink-0" />
        <div className="px-8 py-5 flex items-center justify-between flex-shrink-0 bg-white">
          {step !== 'upload' ? (
            <button onClick={() => setStep(step === 'schedule' ? 'preview' : 'upload')}
              className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors">
              ← Retour
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            {step === 'upload' && (
              <p className="text-xs text-gray-400">Étape 1 sur 3</p>
            )}
            {step === 'preview' && (
              <>
                <p className="text-xs text-gray-400">{selectedPosts.size} post{selectedPosts.size > 1 ? 's' : ''} sélectionné{selectedPosts.size > 1 ? 's' : ''}</p>
                <button onClick={() => setStep('schedule')} disabled={selectedPosts.size === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] transition-colors disabled:opacity-40 shadow-sm">
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
            {step === 'schedule' && (
              <button onClick={handleSchedule} disabled={scheduling}
                className="flex items-center gap-2 px-7 py-2.5 bg-[#0A66C2] text-white text-sm font-bold rounded-full hover:bg-[#004182] transition-colors disabled:opacity-60 shadow-sm">
                {scheduling ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{totalImages > 0 ? `Upload (${totalImages} images)…` : 'Programmation en cours…'}</>
                ) : (
                  <><Calendar className="w-4 h-4" />Confirmer et programmer</>
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
