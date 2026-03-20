'use client'

import { useState } from 'react'
import { Upload, FileText, Calendar, Check, X, Loader2, Pencil, ChevronDown, ChevronUp, Image as ImageIcon, Linkedin } from 'lucide-react'
import LinkedInPreview from '@/components/linkedin/LinkedInPreview'

interface BulkImportProps {
  onImport: (posts: { content: string; scheduledAt: string; status: string; images?: string[] }[]) => Promise<void> | void
  onClose: () => void
}

// ─────────────────────────────────────────────────────────────
// Helpers HTML
// ─────────────────────────────────────────────────────────────

/** Découpe le HTML mammoth en posts individuels via le DOM */
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

  // Garder uniquement les posts qui DÉBUTENT par un header de section
  return posts.filter(p => {
    const d = parser.parseFromString(p, 'text/html')
    const first = d.body.firstElementChild
    if (!first) return false
    const t = (first.textContent || '').trim()
    return t.length >= 4 && t === t.toUpperCase() && /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]/.test(t)
  })
}

/** Convertit HTML → texte brut (pour l'édition et l'envoi) */
function htmlToText(html: string): string {
  if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, '')
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('p, h1, h2, h3').forEach(el => {
    el.insertAdjacentText('afterend', '\n')
  })
  div.querySelectorAll('br').forEach(el => el.replaceWith('\n'))
  div.querySelectorAll('img').forEach(el => el.remove()) // supprimer les images pour le texte final
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

/** Compte les images dans un bout de HTML */
function countImages(html: string): number {
  return (html.match(/<img/g) || []).length
}

/** Extrait les src d'images d'un HTML (base64 ou URL) */
function extractImagesFromHtml(html: string): string[] {
  if (typeof window === 'undefined') return []
  const div = document.createElement('div')
  div.innerHTML = html
  const imgs: string[] = []
  div.querySelectorAll('img').forEach(el => {
    const src = el.getAttribute('src')
    if (src) imgs.push(src)
  })
  return imgs
}

// ─────────────────────────────────────────────────────────────
// Fallback server split (pour txt/md et DOCX sans headers)
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
// Composant principal
// ─────────────────────────────────────────────────────────────

export default function BulkImport({ onImport, onClose }: BulkImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'schedule'>('upload')
  const [posts, setPosts] = useState<string[]>([])      // HTML ou texte brut
  const [isHtml, setIsHtml] = useState(false)            // true = posts contiennent du HTML avec images
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set())
  const [frequency, setFrequency] = useState<'daily' | '3x_week' | 'weekdays' | 'weekly'>('daily')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [dragOver, setDragOver] = useState(false)

  // État par post
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set())
  const [editingPosts, setEditingPosts] = useState<Set<number>>(new Set())
  const [editedContent, setEditedContent] = useState<Record<number, string>>({})
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const [scheduling, setScheduling] = useState(false)

  // ── Gestion fichier ───────────────────────────────────────

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')

    try {
      if (file.name.toLowerCase().match(/\.docx?$/)) {
        // ── DOCX : extraction HTML (avec images) dans le navigateur ──
        setLoadingMsg('Extraction du texte et des images…')
        const arrayBuffer = await file.arrayBuffer()
        const mammoth = await import('mammoth')

        const result = await mammoth.convertToHtml({ arrayBuffer })
        const html = result.value

        setLoadingMsg('Découpage intelligent des posts…')
        let htmlPosts = splitHtmlIntoPosts(html)

        if (htmlPosts.length > 0) {
          // ✅ Découpage HTML réussi — images intégrées
          setPosts(htmlPosts)
          setIsHtml(true)
        } else {
          // Fallback : texte brut → serveur
          setLoadingMsg('Analyse de la structure…')
          const textResult = await mammoth.extractRawText({ arrayBuffer })
          const serverPosts = await serverSplit(textResult.value, file.name)
          setPosts(serverPosts)
          setIsHtml(false)
        }
      } else if (file.name.toLowerCase().match(/\.(txt|md|csv)$/)) {
        // ── TXT / MD : envoi au serveur ──
        setLoadingMsg('Lecture du fichier…')
        const text = await file.text()
        setLoadingMsg('Détection des posts…')
        const serverPosts = await serverSplit(text, file.name)
        setPosts(serverPosts)
        setIsHtml(false)
      } else {
        throw new Error('Format non supporté. Utilisez .docx, .txt ou .md')
      }

      setFilename(file.name)
      setSelectedPosts(new Set(posts.map((_, i) => i)))
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

  // Fix: use the posts length from the resolved value
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

  // ── Actions sur les posts ──────────────────────────────────

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
      // Convertir HTML → texte pour l'édition
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

  /** Contenu affiché : HTML ou texte, avec les éditions si présentes */
  const getDisplayContent = (idx: number) =>
    idx in editedContent ? editedContent[idx] : posts[idx]

  /** Texte brut pour la programmation (strip HTML) */
  const getTextContent = (idx: number) => {
    const c = getDisplayContent(idx)
    if (idx in editedContent) return c // déjà en texte brut
    return isHtml ? htmlToText(c) : c
  }

  // ── Calendrier ────────────────────────────────────────────

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

  // Nombre total d'images détectées dans les posts sélectionnés
  const totalImages = isHtml
    ? [...selectedPosts].reduce((sum, i) => {
        if (i in editedContent) return sum
        return sum + extractImagesFromHtml(posts[i]).length
      }, 0)
    : 0

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <>
    {previewIdx !== null && (
      <LinkedInPreview
        content={getTextContent(previewIdx)}
        images={isHtml && !(previewIdx in editedContent) ? extractImagesFromHtml(posts[previewIdx]) : []}
        onClose={() => setPreviewIdx(null)}
      />
    )}
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#17171E] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[rgba(255,255,255,0.1)]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.07)] flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#FAFAFA]" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
              {step === 'upload' ? 'Importer des posts' : step === 'preview' ? 'Aperçu des posts' : 'Programmer'}
            </h2>
            <p className="text-sm text-[#71717A]">
              {step === 'upload'
                ? 'Glisse un fichier Word ou texte avec tes posts'
                : step === 'preview'
                ? `${selectedPosts.size} / ${posts.length} posts sélectionnés`
                : 'Choisis la fréquence et la date de début'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[#71717A] hover:text-[#A1A1AA] rounded-lg hover:bg-[#1C1C24] transition-colors">
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
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                  dragOver
                    ? 'border-[#7C3AED] bg-[rgba(124,58,237,0.08)]'
                    : 'border-[rgba(255,255,255,0.12)] hover:border-[#7C3AED]'
                }`}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin" />
                    <p className="text-sm text-[#A1A1AA]">{loadingMsg}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-[#71717A] mx-auto mb-4" />
                    <p className="text-sm text-[#A1A1AA] mb-2">Glisse ton fichier ici ou</p>
                    <label className="inline-block px-4 py-2 bg-[#7C3AED] text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-[#6D28D9] transition-all shadow-lg shadow-[#7C3AED]/20 hover:shadow-[#7C3AED]/30">
                      Parcourir
                      <input type="file" className="hidden" accept=".docx,.doc,.txt,.md,.csv" onChange={handleFileInput} />
                    </label>
                    <p className="text-xs text-[#71717A] mt-3">Formats : .docx, .txt, .md — Images intégrées automatiquement</p>
                  </>
                )}
              </div>

              {error && <div className="mt-4 p-3 bg-[rgba(239,68,68,0.1)] text-[#EF4444] text-sm rounded-lg border border-[rgba(239,68,68,0.2)]">{error}</div>}

              <div className="mt-6 p-4 bg-[#1C1C24] rounded-xl border border-[rgba(255,255,255,0.07)]">
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">Comment formater ton fichier ?</h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Les fichiers Word (.docx) sont analysés automatiquement — images incluses.
                  Pour les fichiers texte, sépare chaque post avec <code className="bg-[#111116] text-[#A78BFA] px-1 rounded">---</code> ou une ligne vide.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2 : Preview ── */}
          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-[#71717A]" />
                <span className="text-sm text-[#A1A1AA]">{filename}</span>
                {isHtml && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-[rgba(59,130,246,0.1)] text-[#93C5FD] rounded-full border border-[rgba(59,130,246,0.2)]">
                    <ImageIcon className="w-3 h-3" /> images incluses
                  </span>
                )}
                <button
                  onClick={() => setSelectedPosts(
                    selectedPosts.size === posts.length ? new Set() : new Set(posts.map((_, i) => i))
                  )}
                  className="ml-auto text-xs text-[#A78BFA] font-medium hover:text-[#7C3AED] transition-colors"
                >
                  {selectedPosts.size === posts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {posts.map((_, idx) => {
                const isSelected = selectedPosts.has(idx)
                const isExpanded = expandedPosts.has(idx)
                const isEditing = editingPosts.has(idx)
                const isModified = idx in editedContent
                const displayContent = getDisplayContent(idx)
                const imgCount = isHtml && !isModified ? countImages(displayContent) : 0
                const textLen = isModified ? displayContent.length : htmlToText(displayContent).length

                return (
                  <div
                    key={idx}
                    onClick={() => !isEditing && togglePost(idx)}
                    className={`rounded-xl border transition-all ${
                      isEditing
                        ? 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.05)] cursor-default'
                        : isSelected
                        ? 'border-[rgba(124,58,237,0.5)] bg-[rgba(124,58,237,0.06)] cursor-pointer hover:bg-[rgba(124,58,237,0.08)]'
                        : 'border-[rgba(255,255,255,0.07)] opacity-40 cursor-pointer hover:opacity-60'
                    }`}
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-3 p-4 pb-2">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          isEditing
                            ? 'border-2 border-[#F59E0B] bg-[#0E0E12]'
                            : isSelected
                            ? 'bg-[#7C3AED] text-white'
                            : 'border-2 border-[rgba(255,255,255,0.2)]'
                        }`}
                        onClick={e => { e.stopPropagation(); if (!isEditing) togglePost(idx) }}
                      >
                        {isSelected && !isEditing && <Check className="w-3 h-3" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-medium text-[#71717A]">Post {idx + 1}</span>
                          {isModified && (
                            <span className="text-xs px-1.5 py-0.5 bg-[rgba(245,158,11,0.15)] text-[#F59E0B] rounded-full font-medium border border-[rgba(245,158,11,0.3)]">modifié</span>
                          )}
                          {imgCount > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-[#93C5FD]">
                              <ImageIcon className="w-3 h-3" />{imgCount}
                            </span>
                          )}
                          <span className="text-xs text-[#71717A] ml-auto" style={{ fontFamily: 'DM Mono, monospace' }}>{textLen} car.</span>
                        </div>

                        {/* Contenu du post */}
                        {isEditing ? (
                          <textarea
                            value={editedContent[idx] ?? ''}
                            onChange={e => setEditedContent(prev => ({ ...prev, [idx]: e.target.value }))}
                            onClick={e => e.stopPropagation()}
                            className="w-full text-sm text-[#FAFAFA] border-2 border-[#F59E0B] rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:ring-offset-0 bg-[#0E0E12]"
                            style={{ fontFamily: 'DM Mono, monospace' }}
                            rows={12}
                            autoFocus
                          />
                        ) : isHtml && !isModified ? (
                          // ── Rendu HTML avec images ──
                          <div
                            className={`post-html-content text-sm text-[#A1A1AA] ${!isExpanded ? 'max-h-24 overflow-hidden' : ''}`}
                            style={{
                              maskImage: !isExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
                              WebkitMaskImage: !isExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none'
                            }}
                            dangerouslySetInnerHTML={{ __html: displayContent }}
                          />
                        ) : (
                          // ── Texte brut ──
                          <p className={`text-sm text-[#A1A1AA] whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            {displayContent}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action bar */}
                    <div className="flex items-center gap-1 px-4 pb-3 pt-1" onClick={e => e.stopPropagation()}>
                      {isEditing ? (
                        <>
                          <button onClick={e => saveEdit(idx, e)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#10B981] text-white text-xs font-semibold rounded-lg hover:bg-[#059669] transition-all">
                            <Check className="w-3 h-3" /> Enregistrer
                          </button>
                          <button onClick={e => cancelEdit(idx, e)}
                            className="flex items-center gap-1 px-3 py-1.5 text-[#A1A1AA] text-xs hover:text-[#FAFAFA] hover:bg-[#1C1C24] rounded-lg transition-colors">
                            <X className="w-3 h-3" /> Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={e => startEdit(idx, e)}
                            className="flex items-center gap-1 px-3 py-1.5 text-[#A78BFA] text-xs hover:text-[#7C3AED] hover:bg-[rgba(124,58,237,0.1)] rounded-lg transition-colors">
                            <Pencil className="w-3 h-3" /> Modifier
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setPreviewIdx(idx) }}
                            className="flex items-center gap-1 px-3 py-1.5 text-[#93C5FD] text-xs hover:bg-[rgba(59,130,246,0.1)] rounded-lg transition-colors font-medium">
                            <Linkedin className="w-3 h-3" /> Aperçu
                          </button>
                          <button onClick={e => toggleExpand(idx, e)}
                            className="flex items-center gap-1 px-3 py-1.5 text-[#A1A1AA] text-xs hover:text-[#FAFAFA] hover:bg-[#1C1C24] rounded-lg transition-colors ml-auto">
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
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#FAFAFA] mb-3">Fréquence de publication</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'daily' as const, label: 'Quotidien', desc: '1 post/jour' },
                    { id: '3x_week' as const, label: '3x / semaine', desc: 'Lun, Mer, Ven' },
                    { id: 'weekdays' as const, label: 'Jours ouvrés', desc: 'Lun – Ven' },
                    { id: 'weekly' as const, label: 'Hebdomadaire', desc: '1 post/semaine' },
                  ].map(f => (
                    <button key={f.id} onClick={() => setFrequency(f.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        frequency === f.id
                          ? 'border-[#7C3AED] bg-[rgba(124,58,237,0.08)]'
                          : 'border-[rgba(255,255,255,0.07)] hover:border-[#7C3AED]'
                      }`}>
                      <p className="text-sm font-semibold text-[#FAFAFA]">{f.label}</p>
                      <p className="text-xs text-[#71717A]">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#FAFAFA] mb-2">Date de début</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-[rgba(255,255,255,0.07)] bg-[#111116] text-[#FAFAFA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#FAFAFA] mb-2">Heure</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 border border-[rgba(255,255,255,0.07)] bg-[#111116] text-[#FAFAFA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED]" />
                </div>
              </div>

              <div className="p-4 bg-[rgba(124,58,237,0.05)] rounded-xl border border-[rgba(124,58,237,0.2)]">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-[#A78BFA]" />
                  <span className="text-sm font-semibold text-[#A78BFA]">Résumé</span>
                </div>
                <p className="text-sm text-[#A1A1AA]">
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
                  <p className="text-sm text-[#93C5FD] mt-1.5 font-medium">
                    {totalImages} image{totalImages > 1 ? 's' : ''} détectée{totalImages > 1 ? 's' : ''} — elles seront uploadées et incluses dans les posts LinkedIn.
                  </p>
                )}
                {isHtml && totalImages === 0 && (
                  <p className="text-xs text-[#71717A] mt-1.5">
                    Aucune image embedded détectée dans ce document (les liens sont des hyperlinks Word, pas des images).
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.07)] flex items-center justify-between flex-shrink-0">
          {step !== 'upload' && (
            <button onClick={() => setStep(step === 'schedule' ? 'preview' : 'upload')}
              className="px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] bg-[#1C1C24] hover:bg-[#17171E] rounded-lg transition-colors">
              Retour
            </button>
          )}
          <div className="ml-auto">
            {step === 'preview' && (
              <button onClick={() => setStep('schedule')} disabled={selectedPosts.size === 0}
                className="px-6 py-2.5 bg-[#7C3AED] text-white text-sm font-semibold rounded-lg hover:bg-[#6D28D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#7C3AED]/20 hover:shadow-[#7C3AED]/30">
                Programmer ({selectedPosts.size} posts)
              </button>
            )}
            {step === 'schedule' && (
              <button onClick={handleSchedule} disabled={scheduling}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#7C3AED] text-white text-sm font-semibold rounded-lg hover:bg-[#6D28D9] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#7C3AED]/20 hover:shadow-[#7C3AED]/30">
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
