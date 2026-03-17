'use client'

import { useState } from 'react'
import { Upload, FileText, Calendar, Check, X, ChevronDown, Loader2 } from 'lucide-react'

interface BulkImportProps {
  onImport: (posts: { content: string; scheduledAt: string; status: string }[]) => void
  onClose: () => void
}

export default function BulkImport({ onImport, onClose }: BulkImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'schedule'>('upload')
  const [posts, setPosts] = useState<string[]>([])
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set())
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setPosts(data.posts)
      setFilename(data.filename)
      setSelectedPosts(new Set(data.posts.map((_: string, i: number) => i)))
      setStep('preview')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'import')
    } finally {
      setLoading(false)
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

  const handleSchedule = () => {
    const selected = posts.filter((_, i) => selectedPosts.has(i))
    const scheduled = selected.map((content, i) => {
      const date = new Date(`${startDate}T${startTime}:00`)
      if (frequency === 'daily') {
        date.setDate(date.getDate() + i)
      } else if (frequency === 'weekly') {
        date.setDate(date.getDate() + (i * 7))
      }
      return {
        content,
        scheduledAt: date.toISOString(),
        status: 'scheduled',
      }
    })
    onImport(scheduled)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
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
                  <Loader2 className="w-10 h-10 text-[var(--primary)] mx-auto animate-spin" />
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
                    <p className="text-xs text-gray-400 mt-3">Formats : .docx, .txt, .md</p>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
              )}

              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Comment formater ton fichier ?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Sépare chaque post avec <code className="bg-gray-200 px-1 rounded">---</code> ou laisse
                  une ligne vide entre chaque post. Tu peux aussi numéroter tes posts (1. 2. 3. etc).
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
                  onClick={() => { const allSelected = selectedPosts.size === posts.length; setSelectedPosts(allSelected ? new Set() : new Set(posts.map((_, i) => i))) }}
                  className="ml-auto text-xs text-[var(--primary)] font-medium hover:underline"
                >
                  {selectedPosts.size === posts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {posts.map((post, idx) => (
                <div
                  key={idx}
                  onClick={() => togglePost(idx)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedPosts.has(idx)
                      ? 'border-[var(--primary)] bg-[var(--primary-light)]/30'
                      : 'border-gray-200 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedPosts.has(idx) ? 'bg-[var(--primary)] text-white' : 'border-2 border-gray-300'
                    }`}>
                      {selectedPosts.has(idx) && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-1">Post {idx + 1}</p>
                      <p className="text-sm text-gray-700 line-clamp-3">{post}</p>
                      <p className="text-xs text-gray-400 mt-1">{post.length} caractères</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 3: Schedule */}
          {step === 'schedule' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence de publication</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'daily' as const, label: 'Quotidien', desc: '1 post/jour' },
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
                  {selectedPosts.size} posts programmés {frequency === 'daily' ? 'quotidiennement' : 'chaque semaine'} à partir du{' '}
                  {new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à {startTime}.
                  {frequency === 'daily' && selectedPosts.size > 0 && (
                    <> Dernier post le {new Date(new Date(startDate).getTime() + (selectedPosts.size - 1) * 86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.</>
                  )}
                  {frequency === 'weekly' && selectedPosts.size > 0 && (
                    <> Dernier post le {new Date(new Date(startDate).getTime() + (selectedPosts.size - 1) * 7 * 86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.</>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
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
