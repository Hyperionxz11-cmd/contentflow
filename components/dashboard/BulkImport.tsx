'use client'

import { useState } from 'react'
import { Upload, FileText, Calendar, Check, X, Loader2, Pencil, ChevronDown, ChevronUp, Image as ImageIcon, Linkedin } from 'lucide-react'
import LinkedInPreview from '@/components/linkedin/LinkedInPreview'

interface BulkImportProps {
  onImport: (posts: { content: string; scheduledAt: string; status: string; images?: string[] }[]) => Promise<void> | void
  onClose: () => void
}

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

function htmlToText(html: string): string {
  if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, '')
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('p, h1, h2, h3').forEach(el => { el.insertAdjacentText('afterend', '\n') })
  div.querySelectorAll('br').forEach(el => el.replaceWith('\n'))
  div.querySelectorAll('img').forEach(el => el.remove())
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
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
    if (src) imgs.push(src)
  })
  return imgs
}

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

const font = "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export default function BulkImport({ onImport, onClose }: BulkImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'schedule'>('upload')
  const [posts, setPosts] = useState<string[]>([])
  const [isHtml, setIsHtml] = useState(false)
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set())
  const [frequency, setFrequency] = useState<'daily' | '3x_week' | 'weekdays' | 'weekly'>('daily')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [dragOver, setDragOver] = useState(false)
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set())
  const [editingPosts, setEditingPosts] = useState<Set<number>>(new Set())
  const [editedContent, setEditedContent] = useState<Record<number, string>>({})
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const [scheduling, setScheduling] = useState(false)

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
        return { content: getTextContent(i), scheduledAt: currentDate.toISOString(), status: 'scheduled', images }
      })
      await onImport(scheduled)
    } finally {
      setScheduling(false)
    }
  }

  const totalImages = isHtml
    ? [...selectedPosts].reduce((sum, i) => {
        if (i in editedContent) return sum
        return sum + extractImagesFromHtml(posts[i]).length
      }, 0)
    : 0

  return (
    <>
      {previewIdx !== null && (
        <LinkedInPreview
          content={getTextContent(previewIdx)}
          images={isHtml && !(previewIdx in editedContent) ? extractImagesFromHtml(posts[previewIdx]) : []}
          onClose={() => setPreviewIdx(null)}
        />
      )}

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: font,
      }}>
        {/* Modal */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.08)',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            flexShrink: 0,
          }}>
            <div>
              <h2 style={{ fontFamily: font, fontWeight: 700, fontSize: '16px', color: 'rgba(0,0,0,0.9)', margin: 0 }}>
                {step === 'upload' ? 'Importer des posts' : step === 'preview' ? 'Aperçu des posts' : 'Programmer'}
              </h2>
              <p style={{ fontFamily: font, fontSize: '13px', color: 'rgba(0,0,0,0.5)', margin: '2px 0 0' }}>
                {step === 'upload'
                  ? 'Glisse un fichier Word ou texte avec tes posts'
                  : step === 'preview'
                  ? `${selectedPosts.size} / ${posts.length} posts sélectionnés`
                  : 'Choisis la fréquence et la date de début'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: 'none', background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(0,0,0,0.4)', transition: 'background 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

            {/* ── STEP 1 : Upload ── */}
            {step === 'upload' && (
              <div>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragOver ? '#0A66C2' : 'rgba(0,0,0,0.2)'}`,
                    borderRadius: '8px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: dragOver ? 'rgba(10,102,194,0.04)' : 'rgba(0,0,0,0.02)',
                    transition: 'all 150ms',
                    cursor: 'default',
                  }}
                >
                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <Loader2 style={{ width: '36px', height: '36px', color: '#0A66C2', animation: 'spin 1s linear infinite' }} />
                      <p style={{ fontFamily: font, fontSize: '13px', color: 'rgba(0,0,0,0.5)', margin: 0 }}>{loadingMsg}</p>
                    </div>
                  ) : (
                    <>
                      <Upload style={{ width: '36px', height: '36px', color: 'rgba(0,0,0,0.3)', margin: '0 auto 12px' }} />
                      <p style={{ fontFamily: font, fontSize: '14px', color: 'rgba(0,0,0,0.6)', margin: '0 0 12px' }}>
                        Glisse ton fichier ici ou
                      </p>
                      <label style={{
                        display: 'inline-block',
                        padding: '8px 20px',
                        borderRadius: '9999px',
                        background: '#0A66C2',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 600,
                        fontFamily: font,
                        cursor: 'pointer',
                        transition: 'background 150ms',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#004182')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#0A66C2')}
                      >
                        Parcourir
                        <input type="file" style={{ display: 'none' }} accept=".docx,.doc,.txt,.md,.csv" onChange={handleFileInput} />
                      </label>
                      <p style={{ fontFamily: font, fontSize: '12px', color: 'rgba(0,0,0,0.4)', marginTop: '12px' }}>
                        Formats : .docx, .txt, .md — Images intégrées automatiquement
                      </p>
                    </>
                  )}
                </div>

                {error && (
                  <div style={{
                    marginTop: '12px', padding: '12px 16px',
                    background: 'rgba(220,38,38,0.06)',
                    border: '1px solid rgba(220,38,38,0.2)',
                    borderRadius: '6px',
                    color: '#DC2626',
                    fontSize: '13px',
                    fontFamily: font,
                  }}>{error}</div>
                )}

                <div style={{
                  marginTop: '20px', padding: '16px',
                  background: '#F3F2EF',
                  borderRadius: '6px',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}>
                  <h3 style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: 'rgba(0,0,0,0.9)', margin: '0 0 6px' }}>
                    Comment formater ton fichier ?
                  </h3>
                  <p style={{ fontFamily: font, fontSize: '12px', color: 'rgba(0,0,0,0.55)', margin: 0, lineHeight: 1.6 }}>
                    Les fichiers Word (.docx) sont analysés automatiquement — images incluses.
                    Pour les fichiers texte, sépare chaque post avec{' '}
                    <code style={{ background: 'rgba(0,0,0,0.08)', color: '#0A66C2', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>---</code>
                    {' '}ou une ligne vide.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 2 : Preview ── */}
            {step === 'preview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* File info row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileText style={{ width: '14px', height: '14px', color: 'rgba(0,0,0,0.4)' }} />
                  <span style={{ fontFamily: font, fontSize: '13px', color: 'rgba(0,0,0,0.5)' }}>{filename}</span>
                  {isHtml && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '11px', fontWeight: 600,
                      padding: '2px 8px', borderRadius: '9999px',
                      background: 'rgba(10,102,194,0.08)', color: '#0A66C2',
                      border: '1px solid rgba(10,102,194,0.2)',
                      fontFamily: font,
                    }}>
                      <ImageIcon style={{ width: '10px', height: '10px' }} /> images incluses
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedPosts(
                      selectedPosts.size === posts.length ? new Set() : new Set(posts.map((_, i) => i))
                    )}
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      color: '#0A66C2', fontSize: '12px', fontWeight: 600,
                      fontFamily: font, cursor: 'pointer',
                    }}
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
                      style={{
                        borderRadius: '6px',
                        border: isEditing
                          ? '1px solid rgba(245,158,11,0.4)'
                          : isSelected
                          ? '1px solid rgba(10,102,194,0.4)'
                          : '1px solid rgba(0,0,0,0.1)',
                        background: isEditing
                          ? 'rgba(245,158,11,0.03)'
                          : isSelected
                          ? 'rgba(10,102,194,0.03)'
                          : 'rgba(0,0,0,0.01)',
                        opacity: !isEditing && !isSelected ? 0.45 : 1,
                        cursor: isEditing ? 'default' : 'pointer',
                        transition: 'all 150ms',
                      }}
                    >
                      {/* Card header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px 6px' }}>
                        {/* Checkbox */}
                        <div
                          onClick={e => { e.stopPropagation(); if (!isEditing) togglePost(idx) }}
                          style={{
                            width: '18px', height: '18px', borderRadius: '4px',
                            flexShrink: 0, marginTop: '2px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isSelected && !isEditing ? '#0A66C2' : 'transparent',
                            border: isEditing
                              ? '2px solid rgba(245,158,11,0.6)'
                              : isSelected
                              ? '2px solid #0A66C2'
                              : '2px solid rgba(0,0,0,0.2)',
                            transition: 'all 150ms',
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected && !isEditing && <Check style={{ width: '11px', height: '11px', color: '#FFFFFF' }} />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 600, color: 'rgba(0,0,0,0.4)' }}>
                              Post {idx + 1}
                            </span>
                            {isModified && (
                              <span style={{
                                fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '9999px',
                                background: 'rgba(245,158,11,0.1)', color: '#D97706',
                                border: '1px solid rgba(245,158,11,0.25)', fontFamily: font,
                              }}>modifié</span>
                            )}
                            {imgCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#0A66C2', fontFamily: font }}>
                                <ImageIcon style={{ width: '10px', height: '10px' }} />{imgCount}
                              </span>
                            )}
                            <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: '11px', color: 'rgba(0,0,0,0.3)' }}>
                              {textLen} car.
                            </span>
                          </div>

                          {isEditing ? (
                            <textarea
                              value={editedContent[idx] ?? ''}
                              onChange={e => setEditedContent(prev => ({ ...prev, [idx]: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              autoFocus
                              rows={12}
                              style={{
                                width: '100%', fontFamily: 'monospace', fontSize: '13px',
                                color: 'rgba(0,0,0,0.85)', lineHeight: 1.6,
                                border: '1px solid rgba(245,158,11,0.5)',
                                borderRadius: '6px', padding: '10px 12px',
                                resize: 'none', outline: 'none',
                                background: '#FEFCE8', boxSizing: 'border-box',
                              }}
                            />
                          ) : isHtml && !isModified ? (
                            <div
                              style={{
                                fontSize: '13px', color: 'rgba(0,0,0,0.65)', lineHeight: 1.6,
                                maxHeight: isExpanded ? 'none' : '80px',
                                overflow: isExpanded ? 'visible' : 'hidden',
                                maskImage: !isExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
                                WebkitMaskImage: !isExpanded ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
                              }}
                              dangerouslySetInnerHTML={{ __html: displayContent }}
                            />
                          ) : (
                            <p style={{
                              fontSize: '13px', color: 'rgba(0,0,0,0.65)', fontFamily: font, lineHeight: 1.6,
                              margin: 0, whiteSpace: 'pre-wrap',
                              display: isExpanded ? 'block' : '-webkit-box',
                              WebkitLineClamp: isExpanded ? 'unset' : 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: isExpanded ? 'visible' : 'hidden',
                            }}>
                              {displayContent}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 14px 10px' }} onClick={e => e.stopPropagation()}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={e => saveEdit(idx, e)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '5px 12px', borderRadius: '9999px',
                                border: 'none', background: '#059669', color: '#FFFFFF',
                                fontSize: '12px', fontWeight: 600, fontFamily: font, cursor: 'pointer',
                              }}
                            >
                              <Check style={{ width: '11px', height: '11px' }} /> Enregistrer
                            </button>
                            <button
                              onClick={e => cancelEdit(idx, e)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '5px 12px', borderRadius: '9999px',
                                border: '1px solid rgba(0,0,0,0.15)', background: 'transparent',
                                color: 'rgba(0,0,0,0.55)', fontSize: '12px', fontFamily: font, cursor: 'pointer',
                              }}
                            >
                              <X style={{ width: '11px', height: '11px' }} /> Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={e => startEdit(idx, e)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '5px 10px', borderRadius: '9999px',
                                border: 'none', background: 'transparent',
                                color: '#0A66C2', fontSize: '12px', fontWeight: 600, fontFamily: font, cursor: 'pointer',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(10,102,194,0.08)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Pencil style={{ width: '11px', height: '11px' }} /> Modifier
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setPreviewIdx(idx) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '5px 10px', borderRadius: '9999px',
                                border: 'none', background: 'transparent',
                                color: '#0A66C2', fontSize: '12px', fontWeight: 600, fontFamily: font, cursor: 'pointer',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(10,102,194,0.08)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Linkedin style={{ width: '11px', height: '11px' }} /> Aperçu
                            </button>
                            <button
                              onClick={e => toggleExpand(idx, e)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '5px 10px', borderRadius: '9999px',
                                border: 'none', background: 'transparent',
                                color: 'rgba(0,0,0,0.4)', fontSize: '12px', fontFamily: font, cursor: 'pointer',
                                marginLeft: 'auto',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {isExpanded
                                ? <><ChevronUp style={{ width: '12px', height: '12px' }} />Réduire</>
                                : <><ChevronDown style={{ width: '12px', height: '12px' }} />Voir tout</>
                              }
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Frequency */}
                <div>
                  <label style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: 'rgba(0,0,0,0.75)', display: 'block', marginBottom: '10px' }}>
                    Fréquence de publication
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { id: 'daily' as const, label: 'Quotidien', desc: '1 post/jour' },
                      { id: '3x_week' as const, label: '3x / semaine', desc: 'Lun, Mer, Ven' },
                      { id: 'weekdays' as const, label: 'Jours ouvrés', desc: 'Lun – Ven' },
                      { id: 'weekly' as const, label: 'Hebdomadaire', desc: '1 post/semaine' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFrequency(f.id)}
                        style={{
                          padding: '14px 16px', borderRadius: '6px', textAlign: 'left', cursor: 'pointer',
                          border: frequency === f.id ? '2px solid #0A66C2' : '1px solid rgba(0,0,0,0.12)',
                          background: frequency === f.id ? 'rgba(10,102,194,0.04)' : '#FFFFFF',
                          transition: 'all 150ms',
                          fontFamily: font,
                        }}
                      >
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(0,0,0,0.85)', margin: '0 0 2px' }}>{f.label}</p>
                        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.45)', margin: 0 }}>{f.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: 'rgba(0,0,0,0.75)', display: 'block', marginBottom: '6px' }}>
                      Date de début
                    </label>
                    <input
                      type="date" value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px',
                        border: '1px solid rgba(0,0,0,0.35)', borderRadius: '4px',
                        fontSize: '13px', fontFamily: font, color: 'rgba(0,0,0,0.85)',
                        outline: 'none', boxSizing: 'border-box', background: '#FFFFFF',
                      }}
                      onFocus={e => (e.currentTarget.style.border = '2px solid #0A66C2')}
                      onBlur={e => (e.currentTarget.style.border = '1px solid rgba(0,0,0,0.35)')}
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: 'rgba(0,0,0,0.75)', display: 'block', marginBottom: '6px' }}>
                      Heure
                    </label>
                    <input
                      type="time" value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px',
                        border: '1px solid rgba(0,0,0,0.35)', borderRadius: '4px',
                        fontSize: '13px', fontFamily: font, color: 'rgba(0,0,0,0.85)',
                        outline: 'none', boxSizing: 'border-box', background: '#FFFFFF',
                      }}
                      onFocus={e => (e.currentTarget.style.border = '2px solid #0A66C2')}
                      onBlur={e => (e.currentTarget.style.border = '1px solid rgba(0,0,0,0.35)')}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(10,102,194,0.04)',
                  border: '1px solid rgba(10,102,194,0.2)',
                  borderRadius: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Calendar style={{ width: '14px', height: '14px', color: '#0A66C2' }} />
                    <span style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: '#0A66C2' }}>Résumé</span>
                  </div>
                  <p style={{ fontFamily: font, fontSize: '13px', color: 'rgba(0,0,0,0.65)', margin: 0, lineHeight: 1.6 }}>
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
                    <p style={{ fontFamily: font, fontSize: '13px', fontWeight: 600, color: '#0A66C2', margin: '6px 0 0' }}>
                      {totalImages} image{totalImages > 1 ? 's' : ''} détectée{totalImages > 1 ? 's' : ''} — elles seront uploadées et incluses dans les posts LinkedIn.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: '#FAFAFA',
          }}>
            {step !== 'upload' ? (
              <button
                onClick={() => setStep(step === 'schedule' ? 'preview' : 'upload')}
                style={{
                  padding: '8px 18px', borderRadius: '9999px',
                  border: '1px solid rgba(0,0,0,0.3)', background: '#FFFFFF',
                  color: 'rgba(0,0,0,0.7)', fontSize: '14px', fontWeight: 600,
                  fontFamily: font, cursor: 'pointer', transition: 'all 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
              >
                Retour
              </button>
            ) : <div />}

            <div>
              {step === 'preview' && (
                <button
                  onClick={() => setStep('schedule')}
                  disabled={selectedPosts.size === 0}
                  style={{
                    padding: '8px 20px', borderRadius: '9999px',
                    border: 'none', background: '#0A66C2', color: '#FFFFFF',
                    fontSize: '14px', fontWeight: 700, fontFamily: font,
                    cursor: selectedPosts.size === 0 ? 'not-allowed' : 'pointer',
                    opacity: selectedPosts.size === 0 ? 0.4 : 1,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => { if (selectedPosts.size > 0) e.currentTarget.style.background = '#004182' }}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0A66C2')}
                >
                  Programmer ({selectedPosts.size} posts)
                </button>
              )}
              {step === 'schedule' && (
                <button
                  onClick={handleSchedule}
                  disabled={scheduling}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 20px', borderRadius: '9999px',
                    border: 'none', background: '#0A66C2', color: '#FFFFFF',
                    fontSize: '14px', fontWeight: 700, fontFamily: font,
                    cursor: scheduling ? 'not-allowed' : 'pointer',
                    opacity: scheduling ? 0.6 : 1,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => { if (!scheduling) e.currentTarget.style.background = '#004182' }}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0A66C2')}
                >
                  {scheduling ? (
                    <><Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                      {totalImages > 0 ? `Upload images (${totalImages})…` : 'Programmation…'}
                    </>
                  ) : 'Confirmer et programmer'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
