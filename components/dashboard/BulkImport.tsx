'use client'

import { useState } from 'react'
import { Upload, FileText, Calendar, Check, X, Loader2, ImagePlus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface BulkImportProps {
  onImport: (posts: { content: string; scheduledAt: string; status: string; image_url?: string }[]) => void
  onClose: () => void
}

export default function BulkImport({ onImport, onClose }: BulkImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'schedule'>('upload')
  const [posts, setPosts] = useState<string[]>([])
  const [postImages, setPostImages] = useState<Record<number, string>>({})
  const [uploadingImage, setUploadingImage] = useState<number | null>(null)
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set())
  const [frequency, setFrequency] = useState<'daily' | '3x_week' | 'weekdays' | 'weekly' | 'monthly'>('daily')
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
      setPostImages({})
      setSelectedPosts(new Set(data.posts.map((_: string, i: number) => i)))
      setStep('preview')
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import")
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

  const handleImageUpload = async (idx: number, file: File) => {
    setUploadingImage(idx)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}_post${idx}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(path)
      setPostImages(prev => ({ ...prev, [idx]: publicUrl }))
    } catch (err: any) {
      console.error('Image upload error:', err)
    } finally {
      setUploadingImage(null)
    }
  }

  const removeImage = (idx: number) => {
    setPostImages(prev => { const n = { ...prev }; delete n[idx]; return n })
  }

  const togglePost = (idx: number) => {
    const next = new Set(selectedPosts)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelectedPosts(next)
  }

  const getNextDate = (current: Date, freq: string): Date => {
    const next = new Date(current)
    const day = next.getDay()
    switch (freq) {
      case 'daily': next.setDate(next.getDate() + 1); break
      case '3x_week':
        if (day === 1) next.setDate(next.getDate() + 2)
        else if (day === 3) next.setDate(next.getDate() + 2)
        else if (day === 5) next.setDate(next.getDate() + 3)
        else { const d = (8 - day) % 7 || 7; next.setDate(next.getDate() + d) }
        break
      case 'weekdays':
        next.setDate(next.getDate() + 1)
        while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1)
        break
      case 'weekly': next.setDate(next.getDate() + 7); break
      case 'monthly': next.setMonth(next.getMonth() + 1); break
    }
    return next
  }

  const getFrequencyLabel = () => ({
    daily: 'tous les jours', '3x_week': '3x par semaine (Lun, Mer, Ven)',
    weekdays: 'du lundi au vendredi', weekly: 'chaque semaine', monthly: 'chaque mois',
  }[frequency])

  const handleSchedule = () => {
    const selectedIndexes = posts.map((_, i) => i).filter(i => selectedPosts.has(i))
    let currentDate = new Date(`${startDate}T${startTime}:00`)
    const scheduled = selectedIndexes.map((originalIdx, i) => {
      if (i > 0) currentDate = getNextDate(currentDate, frequency)
      return { content: posts[originalIdx], scheduledAt: currentDate.toISOString(), status: 'scheduled', image_url: postImages[originalIdx] || undefined }
    })
    onImport(scheduled)
  }

  const imagesCount = Object.keys(postImages).length

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'upload' ? 'Importer des posts' : step === 'preview' ? 'Aperçu des posts' : 'Programmer'}
            </h2>
            <p className="text-sm text-gray-400">
              {step === 'upload' ? 'Glisse un fichier Word ou texte avec tes posts'
                : step === 'preview' ? `${selectedPosts.size} / ${posts.length} posts · ${imagesCount} image${imagesCount !== 1 ? 's' : ''}`
                : 'Choisis la fréquence et la date de début'}
            </p>
          </div>
          <div className="flex items-center gap-1 mr-4">
            {(['upload', 'preview', 'schedule'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s ? 'bg-[var(--primary)] text-white' :
                  (step === 'schedule' || (step === 'preview' && i === 0)) ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>{i + 1}</div>
                {i < 2 && <div className="w-3 h-px bg-gray-200" />}
              </div>
            ))}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'upload' && (
            <div>
              <div onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragOver ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-gray-200 hover:border-gray-300'}`}>
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
                    <p className="text-sm text-gray-500">Analyse du fichier...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">Glisse ton fichier ici ou</p>
                    <label className="inline-block px-4 py-2 bg-[var(--primary)] text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-[var(--primary-dark)] transition-colors">
                      Parcourir
                      <input type="file" className="hidden" accept=".docx,.doc,.txt,.md,.csv" onChange={handleFileInput} />
                    </label>
                    <p className="text-xs text-gray-400 mt-3">Formats : .docx, .txt, .md</p>
                  </>
                )}
              </div>
              {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Comment formater ton fichier ?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Sépare chaque post avec <code className="bg-gray-200 px-1 rounded">---</code> ou laisse une ligne vide entre chaque post.
                  Tu peux aussi numéroter tes posts (1. 2. 3. etc). Chaque bloc deviendra un post LinkedIn séparé.
                </p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{filename}</span>
                <button onClick={() => { const a = selectedPosts.size === posts.length; setSelectedPosts(a ? new Set() : new Set(posts.map((_, i) => i))) }}
                  className="ml-auto text-xs text-[var(--primary)] font-medium hover:underline">
                  {selectedPosts.size === posts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
              {posts.map((post, idx) => (
                <div key={idx} className={`p-4 rounded-xl border transition-all ${selectedPosts.has(idx) ? 'border-[var(--primary)] bg-[var(--primary-light)]/20' : 'border-gray-200 opacity-60'}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => togglePost(idx)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${selectedPosts.has(idx) ? 'bg-[var(--primary)] text-white' : 'border-2 border-gray-300'}`}>
                      {selectedPosts.has(idx) && <Check className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-1">Post {idx + 1} · {post.length} caractères</p>
                      <p className="text-sm text-gray-700 line-clamp-3">{post}</p>
                      <div className="mt-3">
                        {postImages[idx] ? (
                          <div className="relative inline-block">
                            <img src={postImages[idx]} alt="" className="h-20 w-auto rounded-lg object-cover border border-gray-200" />
                            <button onClick={() => removeImage(idx)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${uploadingImage === idx ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-500 hover:bg-[var(--primary-light)] hover:text-[var(--primary)]'}`}>
                            {uploadingImage === idx ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload...</> : <><ImagePlus className="w-3.5 h-3.5" /> Ajouter une image</>}
                            <input type="file" className="hidden" accept="image/*" disabled={uploadingImage !== null}
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(idx, f) }} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 'schedule' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Fréquence de publication</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: 'daily', label: 'Quotidien', desc: '1 post / jour' },
                    { id: '3x_week', label: '3x / semaine', desc: 'Lun, Mer, Ven' },
                    { id: 'weekdays', label: 'Jours ouvrés', desc: 'Lun – Ven' },
                    { id: 'weekly', label: 'Hebdomadaire', desc: '1 post / semaine' },
                    { id: 'monthly', label: 'Mensuel', desc: '1 post / mois' },
                  ] as const).map(f => (
                    <button key={f.id} onClick={() => setFrequency(f.id as any)}
                      className={`p-4 rounded-xl border text-left transition-all ${frequency === f.id ? 'border-[var(--primary)] bg-[var(--primary-light)]/30' : 'border-gray-200 hover:border-gray-300'}`}>
                      <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                      <p className="text-xs text-gray-400">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure de publication</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent" />
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-[var(--primary)]" />
                  <span className="text-sm font-semibold text-[var(--primary)]">Résumé</span>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{selectedPosts.size} posts</span> programmés {getFrequencyLabel()}, à partir du{' '}
                  {new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à <span className="font-semibold">{startTime}</span>.
                </p>
                {imagesCount > 0 && <p className="text-sm text-[var(--primary)] mt-1 font-medium">📷 {imagesCount} image{imagesCount !== 1 ? 's' : ''} attachée{imagesCount !== 1 ? 's' : ''}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          {step !== 'upload' ? (
            <button onClick={() => setStep(step === 'schedule' ? 'preview' : 'upload')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">← Retour</button>
          ) : <div />}
          <div>
            {step === 'preview' && (
              <button onClick={() => setStep('schedule')} disabled={selectedPosts.size === 0}
                className="px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-40">
                Programmer ({selectedPosts.size})
              </button>
            )}
            {step === 'schedule' && (
              <button onClick={handleSchedule}
                className="px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-colors">
                ✓ Confirmer et programmer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
