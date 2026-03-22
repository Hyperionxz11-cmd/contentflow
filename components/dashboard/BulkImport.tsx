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

  const SF = '-apple-system, "SF Pro Display", BlinkMacSystemFont, "Helvetica Neue", sans-serif'
  const currentStepIdx = step === 'upload' ? 0 : step === 'preview' ? 1 : 2

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
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', zIndex:80, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', fontFamily:SF }}>
        <div style={{ background:'#fff', borderRadius:'28px', boxShadow:'0 40px 80px -20px rgba(0,0,0,0.22)', width:'100%', maxWidth:'600px', maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Header */}
          <div style={{ padding:'28px 28px 20px', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#0A66C2', marginBottom:'4px' }}>Intelligence Artificielle</p>
                <h3 style={{ fontSize:'22px', fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.3px', margin:0 }}>3 variantes générées</h3>
              </div>
              <button onClick={() => { setAiModalIdx(null); setAiVariants(null) }}
                style={{ width:'32px', height:'32px', borderRadius:'50%', background:'#f2f2f7', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#86868b' }}>
                <X style={{ width:'16px', height:'16px' }} />
              </button>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'20px 28px', display:'flex', flexDirection:'column', gap:'12px' }}>
            {aiVariants.map((v, i) => (
              <button key={i} onClick={() => applyVariant(v)}
                style={{ width:'100%', textAlign:'left', padding:'20px', borderRadius:'18px', background:'#f5f5f7', border:'2px solid transparent', cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#0A66C2'; (e.currentTarget as HTMLButtonElement).style.background = '#f0f7ff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f7' }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                  <span style={{ padding:'3px 10px', background:'rgba(10,102,194,0.1)', color:'#0A66C2', fontSize:'11px', fontWeight:700, borderRadius:'999px', letterSpacing:'0.04em' }}>{v.format}</span>
                  <span style={{ fontSize:'12px', color:'#86868b' }}>{v.description}</span>
                  <span style={{ marginLeft:'auto', fontSize:'12px', color:'#0A66C2', fontWeight:600, display:'flex', alignItems:'center', gap:'4px' }}>Appliquer <ArrowRight style={{ width:'12px', height:'12px' }} /></span>
                </div>
                <p style={{ fontSize:'14px', color:'#1d1d1f', lineHeight:1.6, margin:0, display:'-webkit-box', WebkitLineClamp:5, WebkitBoxOrient:'vertical', overflow:'hidden', whiteSpace:'pre-wrap' }}>{v.content}</p>
                <p style={{ fontSize:'11px', color:'#86868b', marginTop:'10px', paddingTop:'10px', borderTop:'1px solid rgba(0,0,0,0.06)' }}>{v.content.length} caractères</p>
              </button>
            ))}
          </div>
          <div style={{ padding:'16px 28px', borderTop:'1px solid rgba(0,0,0,0.06)', textAlign:'center' }}>
            <p style={{ fontSize:'11px', color:'#86868b', margin:0 }}>✦ Powered by Claude AI</p>
          </div>
        </div>
      </div>
    )}

    {/* ── MAIN MODAL ── */}
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', fontFamily:SF }}>
      <div style={{ background:'#fff', borderRadius:'28px', boxShadow:'0 48px 96px -24px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)', width:'100%', maxWidth:'680px', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* ── HEADER ── */}
        <div style={{ padding:'28px 28px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#0A66C2', margin:'0 0 6px' }}>ContentFlow</p>
            <h2 style={{ fontSize:'26px', fontWeight:700, letterSpacing:'-0.5px', color:'#1d1d1f', margin:0, lineHeight:1.1 }}>
              {step === 'upload' ? 'Importer des posts' : step === 'preview' ? 'Sélectionner les posts' : 'Planifier la publication'}
            </h2>
          </div>
          <button onClick={onClose}
            style={{ width:'34px', height:'34px', borderRadius:'50%', background:'#f2f2f7', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#86868b', flexShrink:0, marginTop:'4px' }}>
            <X style={{ width:'16px', height:'16px' }} />
          </button>
        </div>

        {/* ── STEP DOTS ── */}
        <div style={{ padding:'20px 28px 0', display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
          {['Import', 'Sélection', 'Programmer'].map((label, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{
                width: i === currentStepIdx ? '28px' : '8px',
                height:'8px',
                borderRadius:'999px',
                background: i <= currentStepIdx ? '#0A66C2' : '#d1d1d6',
                transition:'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                flexShrink:0,
              }} />
              {i < 2 && <div style={{ width:'20px', height:'1px', background:'#d1d1d6', flexShrink:0 }} />}
            </div>
          ))}
          <span style={{ fontSize:'12px', color:'#86868b', marginLeft:'4px' }}>
            {step === 'upload' ? 'Import' : step === 'preview' ? 'Sélection' : 'Programmer'}
          </span>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>

          {/* ─── STEP 1 : Upload ─── */}
          {step === 'upload' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  background: dragOver ? 'rgba(10,102,194,0.04)' : '#f5f5f7',
                  borderRadius:'20px',
                  border: dragOver ? '2px dashed #0A66C2' : '2px dashed transparent',
                  transition:'all 0.2s',
                  cursor:'pointer',
                }}
              >
                <label style={{ display:'block', padding:'48px 24px', cursor:'pointer', textAlign:'center' }}>
                  <input type="file" style={{ display:'none' }} accept=".docx,.doc,.txt,.md,.csv" onChange={handleFileInput} />
                  {loading ? (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
                      <div style={{ width:'64px', height:'64px', borderRadius:'20px', background:'rgba(10,102,194,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Loader2 style={{ width:'28px', height:'28px', color:'#0A66C2', animation:'spin 1s linear infinite' }} />
                      </div>
                      <div>
                        <p style={{ fontSize:'15px', fontWeight:600, color:'#1d1d1f', margin:'0 0 4px' }}>{loadingMsg}</p>
                        <p style={{ fontSize:'13px', color:'#86868b', margin:0 }}>Analyse en cours…</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'14px' }}>
                      <div style={{ width:'64px', height:'64px', borderRadius:'20px', background: dragOver ? 'rgba(10,102,194,0.12)' : 'rgba(0,0,0,0.06)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                        <Upload style={{ width:'26px', height:'26px', color: dragOver ? '#0A66C2' : '#86868b', transition:'all 0.2s' }} />
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <p style={{ fontSize:'17px', fontWeight:600, color:'#1d1d1f', margin:'0 0 4px', letterSpacing:'-0.2px' }}>Glisse ton fichier ici</p>
                        <p style={{ fontSize:'14px', color:'#86868b', margin:0 }}>ou clique pour parcourir</p>
                      </div>
                      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', justifyContent:'center' }}>
                        {['.docx', '.txt', '.md'].map(ext => (
                          <span key={ext} style={{ padding:'4px 10px', background:'rgba(0,0,0,0.06)', borderRadius:'999px', fontSize:'12px', fontWeight:600, color:'#48484a', letterSpacing:'0.02em' }}>{ext}</span>
                        ))}
                        <span style={{ padding:'4px 10px', background:'rgba(10,102,194,0.1)', borderRadius:'999px', fontSize:'12px', fontWeight:600, color:'#0A66C2' }}>images auto</span>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              {error && (
                <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px 16px', background:'rgba(255,59,48,0.06)', borderRadius:'14px', color:'#cc0000', fontSize:'14px' }}>
                  <AlertCircle style={{ width:'16px', height:'16px', flexShrink:0 }} />
                  {error}
                </div>
              )}

              {/* Tips */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                {[
                  { title:'Fichier Word .docx', desc:'Analysé automatiquement. Les images sont extraites et incluses dans chaque post.' },
                  { title:'Fichier texte .txt / .md', desc:'Sépare chaque post avec --- ou une ligne vide entre les sections.' },
                ].map((tip, i) => (
                  <div key={i} style={{ padding:'16px', background:'#f5f5f7', borderRadius:'16px' }}>
                    <p style={{ fontSize:'13px', fontWeight:600, color:'#1d1d1f', margin:'0 0 6px' }}>{tip.title}</p>
                    <p style={{ fontSize:'12px', color:'#86868b', margin:0, lineHeight:1.5 }}>{tip.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── STEP 2 : Preview ─── */}
          {step === 'preview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {/* File pill + controls */}
              <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', background:'#f5f5f7', borderRadius:'14px' }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:'#e5e5ea', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <FileText style={{ width:'15px', height:'15px', color:'#48484a' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:'13px', fontWeight:600, color:'#1d1d1f', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{filename}</p>
                  <p style={{ fontSize:'11px', color:'#86868b', margin:0 }}>{posts.length} posts · {selectedPosts.size} sélectionnés</p>
                </div>
                <button onClick={() => setSelectedPosts(selectedPosts.size === posts.length ? new Set() : new Set(posts.map((_, i) => i)))}
                  style={{ fontSize:'12px', fontWeight:600, color:'#0A66C2', background:'none', border:'none', cursor:'pointer', flexShrink:0, padding:'4px 8px' }}>
                  {selectedPosts.size === posts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {aiError && (
                <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px', background:'rgba(255,59,48,0.06)', borderRadius:'12px', fontSize:'13px', color:'#cc0000' }}>
                  <AlertCircle style={{ width:'15px', height:'15px', flexShrink:0 }} />
                  {aiError}
                </div>
              )}

              {!isPremium && (
                <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', background:'rgba(10,102,194,0.05)', borderRadius:'16px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'12px', background:'rgba(10,102,194,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Sparkles style={{ width:'16px', height:'16px', color:'#0A66C2' }} />
                  </div>
                  <div>
                    <p style={{ fontSize:'13px', fontWeight:600, color:'#0A66C2', margin:'0 0 2px' }}>Reformulation IA — Premium</p>
                    <p style={{ fontSize:'12px', color:'#86868b', margin:0 }}>3 variantes optimisées par post : Storytelling, Liste, Hook+CTA</p>
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
                  <div key={idx} onClick={() => !isEditing && togglePost(idx)}
                    style={{
                      borderRadius:'18px',
                      background: isEditing ? '#fffbf0' : isSelected ? '#fff' : '#f5f5f7',
                      boxShadow: isSelected && !isEditing ? '0 2px 12px rgba(0,0,0,0.08), 0 0 0 2px rgba(10,102,194,0.3)' : isEditing ? '0 0 0 2px rgba(251,191,36,0.6)' : 'none',
                      transition:'all 0.2s',
                      cursor: isEditing ? 'default' : 'pointer',
                      overflow:'hidden',
                      opacity: (!isSelected && !isEditing) ? 0.55 : 1,
                    }}>
                    {/* Card body */}
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'16px 16px 12px' }}>
                      {/* Checkbox */}
                      <div onClick={e => { e.stopPropagation(); if (!isEditing) togglePost(idx) }}
                        style={{ width:'20px', height:'20px', borderRadius:'50%', flexShrink:0, marginTop:'2px', display:'flex', alignItems:'center', justifyContent:'center', background: isSelected && !isEditing ? '#0A66C2' : 'rgba(0,0,0,0.08)', border: isEditing ? '2px solid rgba(251,191,36,0.8)' : 'none', transition:'all 0.15s', cursor:'pointer' }}>
                        {isSelected && !isEditing && <Check style={{ width:'11px', height:'11px', color:'#fff' }} />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                          <span style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.06em', color:'#86868b', textTransform:'uppercase' }}>Post {idx + 1}</span>
                          {isModified && <span style={{ fontSize:'11px', padding:'2px 8px', background:'rgba(251,191,36,0.15)', color:'#b45309', borderRadius:'999px', fontWeight:600 }}>modifié</span>}
                          {imgCount > 0 && <span style={{ fontSize:'11px', padding:'2px 8px', background:'rgba(10,102,194,0.08)', color:'#0A66C2', borderRadius:'999px', display:'flex', alignItems:'center', gap:'3px' }}><ImageIcon style={{ width:'10px', height:'10px' }} />{imgCount}</span>}
                          <span style={{ fontSize:'11px', color:'#c7c7cc', marginLeft:'auto' }}>{textLen} car.</span>
                        </div>
                        {isEditing ? (
                          <textarea value={editedContent[idx] ?? ''} onChange={e => setEditedContent(prev => ({ ...prev, [idx]: e.target.value }))} onClick={e => e.stopPropagation()}
                            style={{ width:'100%', fontSize:'13px', color:'#1d1d1f', border:'none', borderRadius:'10px', padding:'10px', resize:'none', outline:'none', background:'rgba(251,191,36,0.08)', fontFamily:'ui-monospace, monospace', lineHeight:1.6 }}
                            rows={9} autoFocus />
                        ) : isHtml && !isModified ? (
                          <div className="post-html-content" style={{ fontSize:'13px', color:'#3a3a3c', lineHeight:1.6, maxHeight: isExpanded ? 'none' : '72px', overflow:'hidden', maskImage: !isExpanded ? 'linear-gradient(to bottom, black 50%, transparent)' : 'none', WebkitMaskImage: !isExpanded ? 'linear-gradient(to bottom, black 50%, transparent)' : 'none' }} dangerouslySetInnerHTML={{ __html: displayContent }} />
                        ) : (
                          <p style={{ fontSize:'13px', color:'#3a3a3c', lineHeight:1.6, margin:0, overflow:'hidden', display:'-webkit-box', WebkitLineClamp: isExpanded ? 999 : 3, WebkitBoxOrient:'vertical', whiteSpace:'pre-wrap' }}>{displayContent}</p>
                        )}
                      </div>
                    </div>
                    {/* Action bar */}
                    <div onClick={e => e.stopPropagation()} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'8px 12px 12px', flexWrap:'wrap' }}>
                      {isEditing ? (
                        <>
                          <button onClick={e => saveEdit(idx, e)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 14px', background:'#0A66C2', color:'#fff', fontSize:'12px', fontWeight:600, border:'none', borderRadius:'999px', cursor:'pointer' }}>
                            <Check style={{ width:'12px', height:'12px' }} /> Enregistrer
                          </button>
                          <button onClick={e => cancelEdit(idx, e)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 14px', background:'rgba(0,0,0,0.06)', color:'#48484a', fontSize:'12px', fontWeight:500, border:'none', borderRadius:'999px', cursor:'pointer' }}>
                            <X style={{ width:'12px', height:'12px' }} /> Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          {isPremium ? (
                            <button onClick={e => handleAIReformulate(idx, e)} disabled={isAiLoading}
                              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background:'rgba(10,102,194,0.08)', color:'#0A66C2', fontSize:'12px', fontWeight:600, border:'none', borderRadius:'999px', cursor:'pointer' }}>
                              {isAiLoading ? <><Loader2 style={{ width:'11px', height:'11px', animation:'spin 1s linear infinite' }} />IA…</> : <><Sparkles style={{ width:'11px', height:'11px' }} />Reformuler</>}
                            </button>
                          ) : (
                            <button style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background:'rgba(0,0,0,0.04)', color:'#c7c7cc', fontSize:'12px', border:'none', borderRadius:'999px', cursor:'not-allowed' }}>
                              <Sparkles style={{ width:'11px', height:'11px' }} />Premium
                            </button>
                          )}
                          <button onClick={e => startEdit(idx, e)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background:'rgba(0,0,0,0.04)', color:'#48484a', fontSize:'12px', fontWeight:500, border:'none', borderRadius:'999px', cursor:'pointer' }}>
                            <Pencil style={{ width:'11px', height:'11px' }} />Modifier
                          </button>
                          <button onClick={e => { e.stopPropagation(); setPreviewIdx(idx) }} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background:'rgba(10,102,194,0.06)', color:'#0A66C2', fontSize:'12px', fontWeight:600, border:'none', borderRadius:'999px', cursor:'pointer' }}>
                            <Linkedin style={{ width:'11px', height:'11px' }} />Aperçu
                          </button>
                          <button onClick={e => toggleExpand(idx, e)} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'6px 10px', background:'none', color:'#86868b', fontSize:'12px', border:'none', borderRadius:'999px', cursor:'pointer', marginLeft:'auto' }}>
                            {isExpanded ? <><ChevronUp style={{ width:'12px', height:'12px' }} />Réduire</> : <><ChevronDown style={{ width:'12px', height:'12px' }} />Voir tout</>}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ─── STEP 3 : Schedule ─── */}
          {step === 'schedule' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

              {/* Smart slots */}
              {isPremium && (
                <div>
                  <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'#86868b', margin:'0 0 12px' }}>
                    {publishedPosts.filter(p => p.status === 'published').length >= 3 ? 'Tes meilleurs créneaux' : 'Créneaux recommandés'}
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                    {smartSlots.map((slot, i) => (
                      <button key={i} onClick={() => applySmartSlot(slot)}
                        style={{ padding:'14px', background:'#f5f5f7', borderRadius:'16px', border:'none', cursor:'pointer', textAlign:'left', transition:'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,102,194,0.06)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f7' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
                          <Star style={{ width:'12px', height:'12px', color: i === 0 ? '#f59e0b' : '#d1d1d6', fill: i === 0 ? '#f59e0b' : '#d1d1d6' }} />
                          <span style={{ fontSize:'14px', fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.2px' }}>{slot.dayLabel} {slot.hour}h</span>
                        </div>
                        <div style={{ height:'3px', background:'#e5e5ea', borderRadius:'999px', marginBottom:'8px' }}>
                          <div style={{ height:'3px', background:'#0A66C2', borderRadius:'999px', width:`${slot.score}%` }} />
                        </div>
                        <p style={{ fontSize:'11px', color:'#86868b', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{slot.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isPremium && (
                <div style={{ display:'flex', alignItems:'center', gap:'14px', padding:'16px', background:'rgba(10,102,194,0.05)', borderRadius:'16px' }}>
                  <div style={{ width:'38px', height:'38px', borderRadius:'12px', background:'rgba(10,102,194,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Clock style={{ width:'16px', height:'16px', color:'#0A66C2' }} />
                  </div>
                  <div>
                    <p style={{ fontSize:'13px', fontWeight:600, color:'#0A66C2', margin:'0 0 2px' }}>Créneaux intelligents — Premium</p>
                    <p style={{ fontSize:'12px', color:'#86868b', margin:0 }}>Analyse automatique de tes meilleurs horaires.</p>
                  </div>
                </div>
              )}

              {/* Frequency */}
              <div>
                <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'#86868b', margin:'0 0 10px' }}>Fréquence</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  {[
                    { id: 'daily' as const, label: 'Quotidien', desc: '1 post / jour' },
                    { id: '3x_week' as const, label: '3× / semaine', desc: 'Lun, Mer, Ven' },
                    { id: 'weekdays' as const, label: 'Jours ouvrés', desc: 'Lun – Ven' },
                    { id: 'weekly' as const, label: 'Hebdomadaire', desc: '1 post / semaine' },
                  ].map(f => (
                    <button key={f.id} onClick={() => setFrequency(f.id)}
                      style={{ padding:'14px 16px', borderRadius:'16px', border:'none', textAlign:'left', cursor:'pointer', transition:'all 0.15s', background: frequency === f.id ? '#0A66C2' : '#f5f5f7' }}>
                      <p style={{ fontSize:'14px', fontWeight:700, color: frequency === f.id ? '#fff' : '#1d1d1f', margin:'0 0 2px', letterSpacing:'-0.2px' }}>{f.label}</p>
                      <p style={{ fontSize:'12px', color: frequency === f.id ? 'rgba(255,255,255,0.75)' : '#86868b', margin:0 }}>{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & time */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'#86868b', margin:'0 0 8px' }}>Date de début</p>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    style={{ width:'100%', padding:'12px 14px', background:'#f5f5f7', border:'none', borderRadius:'14px', fontSize:'14px', color:'#1d1d1f', outline:'none', fontFamily:SF, boxSizing:'border-box' }} />
                </div>
                <div>
                  <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'#86868b', margin:'0 0 8px' }}>Heure</p>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    style={{ width:'100%', padding:'12px 14px', background:'#f5f5f7', border:'none', borderRadius:'14px', fontSize:'14px', color:'#1d1d1f', outline:'none', fontFamily:SF, boxSizing:'border-box' }} />
                </div>
              </div>

              {/* Summary card */}
              <div style={{ padding:'18px', background:'#f5f5f7', borderRadius:'20px' }}>
                <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'#86868b', margin:'0 0 8px' }}>Résumé</p>
                <p style={{ fontSize:'14px', color:'#1d1d1f', lineHeight:1.6, margin:0 }}>
                  <strong>{selectedPosts.size} posts</strong> ·{' '}
                  {frequency === 'daily' ? 'Tous les jours' : frequency === '3x_week' ? '3× par semaine (Lun, Mer, Ven)' : frequency === 'weekdays' ? 'Lun – Ven' : 'Hebdomadaire'}{' '}
                  · À partir du <strong>{new Date(startDate).toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}</strong> à <strong>{startTime}</strong>
                </p>
                {totalImages > 0 && (
                  <p style={{ fontSize:'13px', color:'#0A66C2', margin:'8px 0 0', display:'flex', alignItems:'center', gap:'6px' }}>
                    <ImageIcon style={{ width:'13px', height:'13px' }} />
                    {totalImages} image{totalImages > 1 ? 's' : ''} détectée{totalImages > 1 ? 's' : ''} — incluses automatiquement
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding:'16px 28px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          {step !== 'upload' ? (
            <button onClick={() => setStep(step === 'schedule' ? 'preview' : 'upload')}
              style={{ padding:'10px 18px', background:'none', border:'none', color:'#86868b', fontSize:'14px', fontWeight:500, cursor:'pointer', borderRadius:'999px', fontFamily:SF }}>
              ← Retour
            </button>
          ) : <div />}

          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {step === 'preview' && (
              <span style={{ fontSize:'13px', color:'#86868b' }}>{selectedPosts.size} sélectionné{selectedPosts.size > 1 ? 's' : ''}</span>
            )}
            {step === 'preview' && (
              <button onClick={() => setStep('schedule')} disabled={selectedPosts.size === 0}
                style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 24px', background: selectedPosts.size === 0 ? '#d1d1d6' : '#0A66C2', color:'#fff', fontSize:'14px', fontWeight:600, border:'none', borderRadius:'999px', cursor: selectedPosts.size === 0 ? 'not-allowed' : 'pointer', letterSpacing:'-0.1px', fontFamily:SF }}>
                Continuer <ArrowRight style={{ width:'15px', height:'15px' }} />
              </button>
            )}
            {step === 'schedule' && (
              <button onClick={handleSchedule} disabled={scheduling}
                style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 24px', background: scheduling ? '#d1d1d6' : '#0A66C2', color:'#fff', fontSize:'14px', fontWeight:600, border:'none', borderRadius:'999px', cursor: scheduling ? 'not-allowed' : 'pointer', letterSpacing:'-0.1px', fontFamily:SF }}>
                {scheduling
                  ? <><Loader2 style={{ width:'15px', height:'15px', animation:'spin 1s linear infinite' }} />{totalImages > 0 ? `Upload…` : 'En cours…'}</>
                  : <><Calendar style={{ width:'15px', height:'15px' }} />Confirmer et programmer</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
