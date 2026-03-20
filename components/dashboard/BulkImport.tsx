'use client'

import { useState } from 'react'
import { Upload, FileText, Calendar, Check, X, Loader2, Eye, Pencil, ChevronDown, ChevronUp } from 'lucide-react'

interface BulkImportProps {
  onImport: (posts: { content: string; scheduledAt: string; status: string }[]) => void
  onClose: () => void
}

export default function BulkImport({ onImport, onClose }: BulkImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'schedule'>('upload')
  const [posts, setPosts] = useState<string[]>([])
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set())
  const [frequency, setFrequency] = useState<'daily' | '3x_week' | 'weekdays' | 'weekly'>('daily')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [dragOver, setDragOver] = useState(false)

  // État par post : expanded (aperçu complet) + editing (mode édition)
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set())
  const [editingPosts, setEditingPosts] = useState<Set<number>>(new Set())
  const [editedContent, setEditedContent] = useState<Record<number, string>>({})

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')

    try {
      let text = ''

      if (file.name.toLowerCase().match(/\.docx?$/)) {
        setLoadingMsg('Extraction du texte en cours...')
        try {
          const arrayBuffer = await file.arrayBuffer()
          const mammoth = await import('mammoth')
          const result = await mammoth.extractRawText({ arrayBuffer })
          if (!result.value || result.value.trim().length === 0) {
            throw new Error('Le fichier semble vide ou illisible.')
          }
          text = result.value
        } catch (e: any) {
          throw new Error(`Impossible de lire le fichier DOCX : ${e.message}`)
        }
      } else if (file.name.toLowerCase().match(/\.(txt|md|csv)$/)) {
        setLoadingMsg('Lecture du fichier...')
        text = await file.text()
      } else {
        throw new Error('Format non supporté. Utilisez .docx, .txt ou .md')
      }

      setLoadingMsg('Détection des posts...')
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename: file.name }),
      })

      const rawResponse = await res.text()
      let data: any
      try {
        data = JSON.parse(rawResponse)
      } catch {
        throw new Error(`Erreur serveur inattendue (${res.status})`)
      }

      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`)

      setPosts(data.posts)
      setFilename(data.filename)
      setSelectedPosts(new Set(data.posts.map((_: string, i: number) => i)))
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
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const togglePost = (idx: number) => {
    const next = new Set(selectedPosts)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelectedPosts(next)
  }

  const toggleExpand = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(expandedPosts)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setExpandedPosts(next)
  }

  const startEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(editingPosts)
    next.add(idx)
    setEditingPosts(next)
    // Assurer que le post est expanded en mode édition
    const exp = new Set(expandedPosts)
    exp.add(idx)
    setExpandedPosts(exp)
    // Initialiser avec le contenu actuel (édité ou original)
    if (!(idx in editedContent)) {
      setEditedContent(prev => ({ ...prev, [idx]: posts[idx] }))
    }
  }

  const saveEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(editingPosts)
    next.delete(idx)
    setEditingPosts(next)
  }

  const cancelEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(editingPosts)
    next.delete(idx)
    setEditingPosts(next)
    // Supprimer les modifications
    const ed = { ...editedContent }
    delete ed[idx]
    setEditedContent(ed)
  }

  const getPostContent = (idx: number) => editedContent[idx] ?? posts[idx]

  const getNextDate = (current: Date, freq: string): Date => {
    const next = new Date(current)
    const day = next.getDay()
    switch (freq) {
      case 'daily':
        next.setDate(next.getDate() + 1)
        break
      case '3x_week':
        if (day === 1) next.setDate(next.getDate() + 2)
        else if (day === 3) next.setDate(next.getDate() + 2)
        else if (day === 5) next.setDate(next.getDate() + 3)
        else {
          const daysToMon = (8 - day) % 7 || 7
          next.setDate(next.getDate() + daysToMon)
        }
        break
      case 'weekdays':
        next.setDate(next.getDate() + 1)
        while (next.getDay() === 0 || next.getDay() === 6) {
          next.setDate(next.getDate() + 1)
        }
        break
      case 'weekly':
        next.setDate(next.getDate() + 7)
        break
    }
    return next
  }

  const handleSchedule = () => {
    const selected = posts
      .map((_, i) => i)
      .filter(i => selectedPosts.has(i))
      .map(i => getPostContent(i))

    let currentDate = new Date(`${startDate}T${startTime}:00`)
    const scheduled = selected.map((content, i) => {
      if (i > 0) currentDate = getNextDate(currentDate, frequency)
      return { content, scheduledAt: currentDate.toISOString(), status: 'scheduled' }
    })
    onImport(scheduled)
  }

  return (
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
                ? 'Glisse un fichier Word ou texte avec tes posts'
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

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  dragOver ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
                    <p className="text-sm text-gray-500">{loadingMsg}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">Glisse ton fichier ici ou</p>
                    <label className="inline-block px-4 py-2 bg-[var(--primary)] text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-[var(--primary-dark)] transition-colors">
                      Parcourir
                      <input
                        type="file"
                        className="hidden"
                        accept=".docx,.doc,.txt,.md,.csv"
                        onChange={handleFileInput}
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-3">Formats : .docx, .txt, .md — Taille illimitée</p>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
              )}

              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Comment formater ton fichier ?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Sépare chaque post avec <code className="bg-gray-200 px-1 rounded">---</code> sur une ligne seule,
                  ou laisse une ligne vide entre chaque post. Tu peux aussi numéroter tes posts (1. 2. 3. etc).
                  Chaque bloc de texte deviendra un post LinkedIn séparé.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{filename}</span>
                <button
                  onClick={() => {
                    const allSelected = selectedPosts.size === posts.length
                    setSelectedPosts(allSelected ? new Set() : new Set(posts.map((_, i) => i)))
                  }}
                  className="ml-auto text-xs text-[var(--primary)] font-medium hover:underline"
                >
                  {selectedPosts.size === posts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {posts.map((_, idx) => {
                const content = getPostContent(idx)
                const isSelected = selectedPosts.has(idx)
                const isExpanded = expandedPosts.has(idx)
                const isEditing = editingPosts.has(idx)
                const isModified = idx in editedContent
                const charCount = content.length

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
                    {/* Card Header */}
                    <div className="flex items-start gap-3 p-4">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isEditing
                            ? 'border-2 border-amber-400 bg-white'
                            : isSelected
                            ? 'bg-[var(--primary)] text-white'
                            : 'border-2 border-gray-300'
                        }`}
                        onClick={(e) => { e.stopPropagation(); if (!isEditing) togglePost(idx) }}
                      >
                        {isSelected && !isEditing && <Check className="w-3 h-3" />}
                      </div>

                      {/* Content preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-medium text-gray-400">Post {idx + 1}</p>
                          {isModified && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">modifié</span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">{charCount} car.</span>
                        </div>

                        {isEditing ? (
                          <textarea
                            value={editedContent[idx] ?? content}
                            onChange={(e) => {
                              e.stopPropagation()
                              setEditedContent(prev => ({ ...prev, [idx]: e.target.value }))
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-sm text-gray-700 border border-amber-300 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                            rows={Math.min(Math.max(content.split('\n').length + 2, 5), 15)}
                            autoFocus
                          />
                        ) : isExpanded ? (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
                        ) : (
                          <p className="text-sm text-gray-700 line-clamp-2">{content}</p>
                        )}
                      </div>
                    </div>

                    {/* Action bar */}
                    <div
                      className="flex items-center gap-1 px-4 pb-3 pt-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isEditing ? (
                        <>
                          <button
                            onClick={(e) => saveEdit(idx, e)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Enregistrer
                          </button>
                          <button
                            onClick={(e) => cancelEdit(idx, e)}
                            className="flex items-center gap-1 px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => startEdit(idx, e)}
                            className="flex items-center gap-1 px-3 py-1.5 text-gray-500 text-xs hover:text-[var(--primary)] hover:bg-[var(--primary-light)]/30 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            Modifier
                          </button>
                          <button
                            onClick={(e) => toggleExpand(idx, e)}
                            className="flex items-center gap-1 px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
                          >
                            {isExpanded ? (
                              <><ChevronUp className="w-3 h-3" /> Réduire</>
                            ) : (
                              <><ChevronDown className="w-3 h-3" /> Voir tout</>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* STEP 3: Schedule */}
          {step === 'schedule' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence de publication</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'daily' as const, label: 'Quotidien', desc: '1 post/jour' },
                    { id: '3x_week' as const, label: '3x / semaine', desc: 'Lun, Mer, Ven' },
                    { id: 'weekdays' as const, label: 'Jours ouvrés', desc: 'Lun - Ven' },
                    { id: 'weekly' as const, label: 'Hebdomadaire', desc: '1 post/semaine' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFrequency(f.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        frequency === f.id
                          ? 'border-[var(--primary)] bg-[var(--primary-light)]/30'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{f.label}</p>
                      <p className="text-xs text-gray-400">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-[var(--primary)]" />
                  <span className="text-sm font-medium text-[var(--primary)]">Résumé</span>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedPosts.size} posts programmés{' '}
                  {frequency === 'daily'
                    ? 'tous les jours'
                    : frequency === '3x_week'
                    ? '3x par semaine (Lun, Mer, Ven)'
                    : frequency === 'weekdays'
                    ? 'du lundi au vendredi'
                    : 'chaque semaine'}{' '}
                  à partir du{' '}
                  {new Date(startDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  à {startTime}.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          {step !== 'upload' && (
            <button
              onClick={() => setStep(step === 'schedule' ? 'preview' : 'upload')}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Retour
            </button>
          )}
          <div className="ml-auto">
            {step === 'preview' && (
              <button
                onClick={() => setStep('schedule')}
                disabled={selectedPosts.size === 0}
                className="px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-40"
              >
                Programmer ({selectedPosts.size} posts)
              </button>
            )}
            {step === 'schedule' && (
              <button
                onClick={handleSchedule}
                className="px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-colors"
              >
                Confirmer et programmer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
