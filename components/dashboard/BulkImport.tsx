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

const SF = '-apple-system, "SF Pro Display", BlinkMacSystemFont, "Helvetica Neue", sans-serif'

function ElementBadge({ ok, label, icon }: { ok: boolean; label: string; icon: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
        fontFamily: SF,
        background: ok ? '#f0fdf4' : '#fff7ed',
        color: ok ? '#16a34a' : '#ea580c',
      }}
      title={ok ? `${label} ✓` : `${label} manquant`}
    >
      {icon}
      {label}
      {ok ? <Check style={{ width: 10, height: 10 }} /> : <span style={{ color: '#fb923c' }}>!</span>}
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

  const stepIndex = step === 'upload' ? 0 : step === 'preview' ? 1 : 2

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
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(24px)', zIndex:80, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <div style={{ background:'#fff', borderRadius:24, boxShadow:'0 40px 80px -20px rgba(0,0,0,0.25)', width:'100%', maxWidth:640, maxHeight:'85vh', display:'flex', flexDirection:'column', fontFamily:SF }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid #f5f5f7' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'#f0f7ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Sparkles style={{ width:16, height:16, color:'#0A66C2' }} />
              </div>
              <div>
                <h3 style={{ fontSize:15, fontWeight:700, color:'#1d1d1f', margin:0 }}>3 variantes générées par IA</h3>
                <p style={{ fontSize:12, color:'#86868b', margin:0 }}>Clique sur une variante pour l&apos;appliquer au post {(aiModalIdx ?? 0) + 1}</p>
              </div>
            </div>
            <button onClick={() => { setAiModalIdx(null); setAiVariants(null) }} style={{ padding:8, background:'none', border:'none', cursor:'pointer', color:'#86868b', borderRadius:8 }}>
              <X style={{ width:18, height:18 }} />
            </button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
            {aiVariants.map((v, i) => (
              <button
                key={i}
                onClick={() => applyVariant(v)}
                style={{ width:'100%', textAlign:'left', padding:16, borderRadius:16, border:'2px solid #f5f5f7', background:'#fff', cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='#0A66C2'; (e.currentTarget as HTMLElement).style.background='#f0f7ff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#f5f5f7'; (e.currentTarget as HTMLElement).style.background='#fff' }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ padding:'2px 10px', background:'#f0f7ff', color:'#0A66C2', fontSize:11, fontWeight:700, borderRadius:999 }}>{v.format}</span>
                  <span style={{ fontSize:11, color:'#86868b' }}>{v.description}</span>
                </div>
                <p style={{ fontSize:13, color:'#1d1d1f', whiteSpace:'pre-wrap', lineHeight:1.6, margin:0, display:'-webkit-box', WebkitLineClamp:6, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{v.content}</p>
                <p style={{ fontSize:11, color:'#86868b', marginTop:8 }}>{v.content.length} caractères</p>
              </button>
            ))}
          </div>
          <div style={{ padding:'16px 24px', borderTop:'1px solid #f5f5f7', textAlign:'center' }}>
            <p style={{ fontSize:11, color:'#86868b', margin:0 }}>✨ Powered by Claude AI · Reformulation contextuelle LinkedIn</p>
          </div>
        </div>
      </div>
    )}

    {/* Main Modal */}
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', backdropFilter:'blur(32px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:28, boxShadow:'0 48px 96px -24px rgba(0,0,0,0.2)', width:'100%', maxWidth:640, maxHeight:'92vh', display:'flex', flexDirection:'column', fontFamily:SF, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 28px 20px', borderBottom:'1px solid #f5f5f7', flexShrink:0 }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:700, color:'#1d1d1f', margin:0 }}>
              {step === 'upload' ? 'Importer des posts' : step === 'preview' ? 'Sélectionner les posts' : 'Programmer'}
            </h2>
            <p style={{ fontSize:13, color:'#86868b', margin:'2px 0 0' }}>
              {step === 'upload'
                ? "Importe n'importe quel document — l'IA s'adapte"
                : step === 'preview'
                ? `${selectedPosts.size} / ${posts.length} posts sélectionnés`
                : 'Choisis la fréquence et la date de début'}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {/* Step dots */}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ height:8, borderRadius:999, background: i === stepIndex ? '#0A66C2' : '#e5e5ea', transition:'all 0.3s', width: i === stepIndex ? 28 : 8 }} />
              ))}
            </div>
            <button onClick={onClose} style={{ padding:8, background:'#f5f5f7', border:'none', cursor:'pointer', color:'#86868b', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X style={{ width:16, height:16 }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>

          {/* ── STEP 1 : Upload ── */}
          {step === 'upload' && (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ background: dragOver ? '#f0f7ff' : '#f5f5f7', borderRadius:20, padding:'40px 32px', textAlign:'center', transition:'all 0.2s', border: dragOver ? '2px solid #0A66C2' : '2px solid transparent' }}
              >
                {loading ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                    <Loader2 style={{ width:40, height:40, color:'#0A66C2', animation:'spin 1s linear infinite' }} />
                    <p style={{ fontSize:14, fontWeight:600, color:'#1d1d1f', margin:0 }}>{loadingMsg}</p>
                    <p style={{ fontSize:12, color:'#86868b', margin:0 }}>L&apos;IA analyse la structure du document…</p>
                  </div>
                ) : (
                  <>
                    <div style={{ width:56, height:56, background:'#fff', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 2px 12px rgba(0,0,0,0.08)' }}>
                      <Upload style={{ width:24, height:24, color:'#0A66C2' }} />
                    </div>
                    <p style={{ fontSize:15, fontWeight:600, color:'#1d1d1f', margin:'0 0 4px' }}>Glisse ton fichier ici</p>
                    <p style={{ fontSize:13, color:'#86868b', margin:'0 0 20px' }}>ou parcours tes fichiers</p>
                    <label style={{ display:'inline-block', padding:'10px 24px', background:'#0A66C2', color:'#fff', fontSize:14, fontWeight:600, borderRadius:999, cursor:'pointer' }}>
                      Choisir un fichier
                      <input
                        type="file"
                        style={{ display:'none' }}
                        accept=".docx,.doc,.txt,.md,.csv,.pdf,.rtf"
                        onChange={handleFileInput}
                      />
                    </label>
                    <p style={{ fontSize:12, color:'#86868b', margin:'16px 0 0' }}>
                      .docx · .txt · .md · .pdf · .csv · .rtf
                    </p>
                  </>
                )}
              </div>

              {error && (
                <div style={{ marginTop:16, display:'flex', alignItems:'flex-start', gap:8, padding:12, background:'#fff1f0', color:'#d32f2f', fontSize:13, borderRadius:12 }}>
                  <AlertCircle style={{ width:16, height:16, flexShrink:0, marginTop:1 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* How it works */}
              <div style={{ marginTop:20, padding:20, background:'#f5f5f7', borderRadius:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <Sparkles style={{ width:14, height:14, color:'#0A66C2' }} />
                  <h3 style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', margin:0 }}>Comment ça marche ?</h3>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { n:'1', title:"Importe n'importe quel document", desc:'Word, texte, PDF, CSV' },
                    { n:'2', title:"L'IA détecte automatiquement", desc:'la structure et sépare les posts' },
                    { n:'3', title:'Chaque post est complété', desc:'avec hashtags et CTA si absents' },
                  ].map(item => (
                    <div key={item.n} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ width:20, height:20, borderRadius:999, background:'#0A66C2', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{item.n}</span>
                      <p style={{ fontSize:12, color:'#86868b', margin:0, lineHeight:1.5 }}><strong style={{ color:'#1d1d1f' }}>{item.title}</strong> — {item.desc}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:12, padding:12, background:'#e8f0fe', borderRadius:10 }}>
                  <p style={{ fontSize:12, color:'#0A66C2', fontWeight:600, margin:0 }}>💡 Hook · Contenu · Hashtags · CTA — L&apos;IA complète automatiquement.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 : Preview ── */}
          {step === 'preview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* File info bar */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <FileText style={{ width:14, height:14, color:'#86868b' }} />
                <span style={{ fontSize:13, color:'#86868b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{filename}</span>
                {structure && (
                  <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 10px', background:'#f0f7ff', color:'#0A66C2', borderRadius:999 }}>
                    <Zap style={{ width:11, height:11 }} />
                    {structureLabels[structure] || structure}
                  </span>
                )}
                {method === 'ai' && (
                  <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 10px', background:'#f5f5f7', color:'#1d1d1f', borderRadius:999, fontWeight:600 }}>
                    <Sparkles style={{ width:11, height:11 }} /> IA
                  </span>
                )}
                <button
                  onClick={() => setSelectedPosts(
                    selectedPosts.size === posts.length ? new Set() : new Set(posts.map((_, i) => i))
                  )}
                  style={{ marginLeft:'auto', fontSize:12, color:'#0A66C2', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0 }}
                >
                  {selectedPosts.size === posts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {aiError && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:12, background:'#fff1f0', borderRadius:12, color:'#d32f2f', fontSize:13 }}>
                  <AlertCircle style={{ width:14, height:14, flexShrink:0 }} />
                  <span>{aiError}</span>
                </div>
              )}

              {!isPremium && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:12, background:'#fffbeb', borderRadius:12, color:'#92400e', fontSize:12 }}>
                  <Star style={{ width:14, height:14, flexShrink:0 }} />
                  <span>Passe en <strong>Premium</strong> pour reformuler chaque post avec l&apos;IA en 1 clic.</span>
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
                const imgs = postImages[idx] || []

                return (
                  <div
                    key={idx}
                    onClick={() => togglePost(idx)}
                    style={{ borderRadius:16, background:'#fff', cursor:'pointer', border: isSelected ? 'none' : '1px solid #f0f0f0', boxShadow: isSelected ? '0 2px 16px rgba(10,102,194,0.12), 0 0 0 2px #0A66C2' : '0 1px 6px rgba(0,0,0,0.06)', transition:'all 0.15s' }}
                  >
                    {/* Post header */}
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:16 }}>
                      <div
                        style={{ marginTop:2, width:20, height:20, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background: isSelected ? '#0A66C2' : '#f5f5f7', border: isSelected ? 'none' : '2px solid #e5e5ea', transition:'all 0.15s' }}
                      >
                        {isSelected && <Check style={{ width:11, height:11, color:'#fff' }} />}
                      </div>

                      <div style={{ flex:1, minWidth:0 }}>
                        {/* Title row */}
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                          <span style={{ fontSize:12, fontWeight:600, color:'#86868b' }}>Post {idx + 1}</span>
                          <span style={{ fontSize:12, color:'#c7c7cc' }}>·</span>
                          <span style={{ fontSize:12, color:'#c7c7cc' }}>{content.length} car.</span>
                          {imgs.length > 0 && (
                            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#0A66C2' }}>
                              <ImageIcon style={{ width:11, height:11 }} />{imgs.length}
                            </span>
                          )}
                          {/* Element badges */}
                          <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:'auto' }}>
                            <ElementBadge ok={elements.hook} label="Hook" icon={<Zap style={{ width:9, height:9 }} />} />
                            <ElementBadge ok={elements.hashtags} label="#Tags" icon={<Hash style={{ width:9, height:9 }} />} />
                            <ElementBadge ok={elements.cta} label="CTA" icon={<MessageCircle style={{ width:9, height:9 }} />} />
                          </div>
                        </div>

                        {/* Content preview / edit */}
                        {isEditing ? (
                          <textarea
                            value={idx in editedContent ? editedContent[idx] : content}
                            onChange={e => setEditedContent(prev => ({ ...prev, [idx]: e.target.value }))}
                            onClick={e => e.stopPropagation()}
                            style={{ width:'100%', fontSize:13, color:'#1d1d1f', lineHeight:1.6, border:'2px solid #0A66C2', borderRadius:10, padding:'10px 12px', resize:'none', outline:'none', background:'#fff', fontFamily:SF, boxSizing:'border-box' }}
                            rows={8}
                          />
                        ) : (
                          <p style={{ fontSize:13, color:'#1d1d1f', lineHeight:1.6, margin:0, display:'-webkit-box', WebkitLineClamp: isExpanded ? undefined : 3, WebkitBoxOrient:'vertical', overflow: isExpanded ? 'visible' : 'hidden', whiteSpace: isExpanded ? 'pre-wrap' : 'normal' }}>
                            {content}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div style={{ display:'flex', alignItems:'center', gap:4, padding:'8px 12px', borderTop:'1px solid #f5f5f7', background:'#fafafa', borderRadius:'0 0 16px 16px' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => toggleExpand(idx, e)}
                        style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#86868b', padding:'4px 8px', borderRadius:8, background:'none', border:'none', cursor:'pointer' }}
                      >
                        {isExpanded ? <ChevronUp style={{ width:11, height:11 }} /> : <ChevronDown style={{ width:11, height:11 }} />}
                        {isExpanded ? 'Réduire' : 'Voir tout'}
                      </button>

                      {isEditing ? (
                        <>
                          <button
                            onClick={e => saveEdit(idx, e)}
                            style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#16a34a', padding:'4px 8px', borderRadius:8, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}
                          >
                            <Check style={{ width:11, height:11 }} /> Sauvegarder
                          </button>
                          <button
                            onClick={e => cancelEdit(idx, e)}
                            style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#86868b', padding:'4px 8px', borderRadius:8, background:'none', border:'none', cursor:'pointer' }}
                          >
                            <X style={{ width:11, height:11 }} /> Annuler
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={e => startEdit(idx, e)}
                          style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#86868b', padding:'4px 8px', borderRadius:8, background:'none', border:'none', cursor:'pointer' }}
                        >
                          <Pencil style={{ width:11, height:11 }} /> Éditer
                        </button>
                      )}

                      <button
                        onClick={e => { e.stopPropagation(); setPreviewIdx(idx) }}
                        style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#0A66C2', padding:'4px 8px', borderRadius:8, background:'none', border:'none', cursor:'pointer' }}
                      >
                        <svg style={{ width:11, height:11 }} viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                        Aperçu
                      </button>

                      {isPremium && (
                        <button
                          onClick={e => handleAIReformulate(idx, e)}
                          disabled={isAiLoading}
                          style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#0A66C2', padding:'4px 10px', borderRadius:999, background:'#f0f7ff', border:'none', cursor:'pointer', fontWeight:600, opacity: isAiLoading ? 0.5 : 1 }}
                        >
                          {isAiLoading ? (
                            <Loader2 style={{ width:11, height:11, animation:'spin 1s linear infinite' }} />
                          ) : (
                            <Sparkles style={{ width:11, height:11 }} />
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
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {/* Smart Slots */}
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <Star style={{ width:14, height:14, color:'#f59e0b' }} />
                  <h3 style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', margin:0 }}>Créneaux optimaux LinkedIn</h3>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {smartSlots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => applySmartSlot(slot)}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:14, borderRadius:14, border:'1px solid #f0f0f0', background:'#fff', cursor:'pointer', textAlign:'left', transition:'all 0.15s', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='#0A66C2'; (e.currentTarget as HTMLElement).style.background='#f0f7ff' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#f0f0f0'; (e.currentTarget as HTMLElement).style.background='#fff' }}
                    >
                      <div style={{ width:40, height:40, borderRadius:12, background:'#f0f7ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Clock style={{ width:18, height:18, color:'#0A66C2' }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:14, fontWeight:600, color:'#1d1d1f', margin:0 }}>{slot.dayLabel} à {slot.hour}h</p>
                        <p style={{ fontSize:12, color:'#86868b', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{slot.label}</p>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                        <div style={{ height:6, width:60, background:'#f0f0f0', borderRadius:999, overflow:'hidden' }}>
                          <div style={{ height:'100%', background:'#0A66C2', borderRadius:999, width:`${slot.score}%` }} />
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:'#0A66C2' }}>{slot.score}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & time */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#86868b', marginBottom:6 }}>Date de début</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{ width:'100%', padding:'10px 14px', fontSize:14, background:'#f5f5f7', border:'none', borderRadius:12, outline:'none', fontFamily:SF, boxSizing:'border-box', color:'#1d1d1f' }}
                  />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#86868b', marginBottom:6 }}>Heure</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    style={{ width:'100%', padding:'10px 14px', fontSize:14, background:'#f5f5f7', border:'none', borderRadius:12, outline:'none', fontFamily:SF, boxSizing:'border-box', color:'#1d1d1f' }}
                  />
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#86868b', marginBottom:8 }}>Fréquence de publication</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {([
                    { value: 'daily', label: 'Chaque jour', sub: '7×/sem.' },
                    { value: '3x_week', label: '3× par semaine', sub: 'Lun · Mer · Ven' },
                    { value: 'weekdays', label: 'Jours ouvrés', sub: 'Lun → Ven' },
                    { value: 'weekly', label: 'Hebdo', sub: '1×/sem.' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFrequency(opt.value)}
                      style={{ padding:'14px 16px', borderRadius:14, border:'none', textAlign:'left', cursor:'pointer', transition:'all 0.15s', background: frequency === opt.value ? '#0A66C2' : '#f5f5f7' }}
                    >
                      <p style={{ fontSize:13, fontWeight:600, margin:0, color: frequency === opt.value ? '#fff' : '#1d1d1f' }}>{opt.label}</p>
                      <p style={{ fontSize:11, margin:'2px 0 0', color: frequency === opt.value ? 'rgba(255,255,255,0.75)' : '#86868b' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{ padding:14, background:'#f0f7ff', borderRadius:14, display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#0A66C2' }}>
                <Calendar style={{ width:16, height:16, flexShrink:0 }} />
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
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 28px 20px', borderTop:'1px solid #f5f5f7', flexShrink:0 }}>
          {step === 'upload' ? (
            <button onClick={onClose} style={{ padding:'10px 20px', fontSize:14, color:'#86868b', background:'none', border:'none', cursor:'pointer', borderRadius:999 }}>
              Annuler
            </button>
          ) : (
            <button
              onClick={() => setStep(step === 'schedule' ? 'preview' : 'upload')}
              style={{ padding:'10px 20px', fontSize:14, color:'#86868b', background:'none', border:'none', cursor:'pointer', borderRadius:999 }}
            >
              ← Retour
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={() => setStep('schedule')}
              disabled={selectedPosts.size === 0}
              style={{ padding:'12px 28px', background:'#0A66C2', color:'#fff', fontSize:14, fontWeight:600, borderRadius:999, border:'none', cursor: selectedPosts.size === 0 ? 'not-allowed' : 'pointer', opacity: selectedPosts.size === 0 ? 0.4 : 1, transition:'all 0.15s' }}
            >
              Programmer {selectedPosts.size > 0 ? `${selectedPosts.size} post${selectedPosts.size > 1 ? 's' : ''}` : ''} →
            </button>
          )}

          {step === 'schedule' && (
            <button
              onClick={handleSchedule}
              disabled={scheduling || selectedPosts.size === 0}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 28px', background:'#0A66C2', color:'#fff', fontSize:14, fontWeight:600, borderRadius:999, border:'none', cursor: (scheduling || selectedPosts.size === 0) ? 'not-allowed' : 'pointer', opacity: (scheduling || selectedPosts.size === 0) ? 0.4 : 1 }}
            >
              {scheduling ? (
                <><Loader2 style={{ width:16, height:16, animation:'spin 1s linear infinite' }} /> Programmation…</>
              ) : (
                <><Calendar style={{ width:16, height:16 }} /> Confirmer la programmation</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
