'use client'

import { useState, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Plus, Trash2, Check, Download, Copy, Layers, RefreshCw } from 'lucide-react'

interface Slide {
  id: string
  title: string
  body: string
}

interface CarouselBuilderProps {
  initialText?: string
  onClose: () => void
  onInsert?: (content: string) => void
}

const THEMES = [
  {
    id: 'violet',
    label: 'Violet Pro',
    bg: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
    text: '#ffffff',
    accent: 'rgba(255,255,255,0.2)',
    number: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'dark',
    label: 'Dark Élite',
    bg: 'linear-gradient(135deg, #0f0f1a 0%, #1e1e3f 100%)',
    text: '#e2e8f0',
    accent: 'rgba(167,139,250,0.3)',
    number: 'rgba(167,139,250,0.6)',
  },
  {
    id: 'light',
    label: 'Blanc Épuré',
    bg: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)',
    text: '#1e1b4b',
    accent: 'rgba(99,102,241,0.12)',
    number: 'rgba(99,102,241,0.4)',
  },
  {
    id: 'ocean',
    label: 'Océan',
    bg: 'linear-gradient(135deg, #0369a1 0%, #0891b2 100%)',
    text: '#f0f9ff',
    accent: 'rgba(255,255,255,0.15)',
    number: 'rgba(255,255,255,0.45)',
  },
]

function splitTextToSlides(text: string): Slide[] {
  const clean = text.replace(/<[^>]+>/g, '').trim()
  const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean)

  if (lines.length === 0) return []

  const slides: Slide[] = []

  // First slide = title (first line) + optional subtitle
  slides.push({
    id: crypto.randomUUID(),
    title: lines[0].slice(0, 80),
    body: lines[1] ? lines[1].slice(0, 120) : '',
  })

  // Remaining lines → group into slides (2-3 lines each)
  let buffer: string[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    // Skip if already used as subtitle
    if (i === 1 && slides[0].body === line) continue

    buffer.push(line)
    if (buffer.length >= 3 || i === lines.length - 1) {
      const [titleLine, ...bodyLines] = buffer
      slides.push({
        id: crypto.randomUUID(),
        title: titleLine.slice(0, 80),
        body: bodyLines.join('\n').slice(0, 180),
      })
      buffer = []
    }
  }

  // Last slide = CTA
  slides.push({
    id: crypto.randomUUID(),
    title: 'Tu as aimé ce carousel ?',
    body: '👇 Commente, partage et abonne-toi pour plus de contenus comme celui-ci !',
  })

  return slides.slice(0, 10) // LinkedIn max 10 slides
}

function generateLinkedInPost(slides: Slide[], themeLabel: string): string {
  const lines: string[] = []
  lines.push(slides[0].title)
  lines.push('')
  lines.push('Voici ce que tu trouveras dans ce carousel :')
  lines.push('')
  slides.slice(1, -1).forEach((s, i) => {
    lines.push(`${i + 1}. ${s.title}`)
  })
  lines.push('')
  lines.push('👇 Swipe pour découvrir chaque étape en détail.')
  lines.push('')
  lines.push(slides[slides.length - 1].body)
  lines.push('')
  lines.push('#LinkedIn #ContentMarketing #Carousel')
  return lines.join('\n')
}

export default function CarouselBuilder({ initialText = '', onClose, onInsert }: CarouselBuilderProps) {
  const [slides, setSlides] = useState<Slide[]>(() =>
    initialText ? splitTextToSlides(initialText) : [
      { id: crypto.randomUUID(), title: 'Titre du carousel', body: 'Sous-titre accrocheur ici' },
      { id: crypto.randomUUID(), title: 'Point clé 1', body: 'Description de ce point important' },
      { id: crypto.randomUUID(), title: 'Tu as aimé ?', body: '👇 Partage et abonne-toi !' },
    ]
  )
  const [currentIdx, setCurrentIdx] = useState(0)
  const [themeIdx, setThemeIdx] = useState(0)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingBody, setEditingBody] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inputText, setInputText] = useState(initialText)
  const [showTextInput, setShowTextInput] = useState(!initialText)

  const theme = THEMES[themeIdx]
  const slide = slides[currentIdx]

  const updateSlide = (field: 'title' | 'body', value: string) => {
    setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...s, [field]: value } : s))
  }

  const addSlide = () => {
    const newSlide: Slide = { id: crypto.randomUUID(), title: 'Nouveau slide', body: 'Contenu ici...' }
    const next = [...slides]
    next.splice(currentIdx + 1, 0, newSlide)
    setSlides(next)
    setCurrentIdx(currentIdx + 1)
  }

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) return
    const next = slides.filter((_, i) => i !== idx)
    setSlides(next)
    setCurrentIdx(Math.min(idx, next.length - 1))
  }

  const handleRegenerate = () => {
    if (!inputText.trim()) return
    const newSlides = splitTextToSlides(inputText)
    setSlides(newSlides)
    setCurrentIdx(0)
    setShowTextInput(false)
  }

  const handleCopyPost = async () => {
    const post = generateLinkedInPost(slides, theme.label)
    await navigator.clipboard.writeText(post)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInsert = () => {
    const post = generateLinkedInPost(slides, theme.label)
    onInsert?.(post)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Layers className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Carousel Builder</h2>
              <p className="text-xs text-gray-400">{slides.length} slide{slides.length > 1 ? 's' : ''} · LinkedIn carousel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Left: Slide list + controls */}
          <div className="w-64 border-r border-gray-100 flex flex-col">
            {/* Text input section */}
            <div className="p-4 border-b border-gray-50">
              {showTextInput ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Colle ton texte ici</label>
                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    className="w-full text-xs text-gray-700 border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 h-24 font-mono"
                    placeholder="Colle ton contenu LinkedIn..."
                  />
                  <button
                    onClick={handleRegenerate}
                    disabled={!inputText.trim()}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Générer les slides
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTextInput(true)}
                  className="w-full flex items-center gap-1.5 py-2 text-xs text-violet-600 hover:bg-violet-50 rounded-lg transition-colors font-medium justify-center"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Régénérer depuis texte
                </button>
              )}
            </div>

            {/* Slides list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {slides.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => { setCurrentIdx(i); setEditingTitle(false); setEditingBody(false) }}
                  className={`relative group p-3 rounded-xl cursor-pointer transition-all text-left ${
                    i === currentIdx
                      ? 'ring-2 ring-violet-500 bg-violet-50'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Slide {i + 1}</p>
                      <p className="text-xs font-semibold text-gray-700 truncate">{s.title || '(vide)'}</p>
                      {s.body && <p className="text-[10px] text-gray-400 truncate mt-0.5">{s.body}</p>}
                    </div>
                    {slides.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteSlide(i) }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {slides.length < 10 && (
                <button
                  onClick={addSlide}
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-violet-300 hover:text-violet-500 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un slide
                </button>
              )}
            </div>

            {/* Theme selector */}
            <div className="p-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Thème</p>
              <div className="grid grid-cols-2 gap-1.5">
                {THEMES.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setThemeIdx(i)}
                    className={`p-2 rounded-lg text-[10px] font-semibold transition-all ${
                      i === themeIdx ? 'ring-2 ring-violet-500' : 'hover:ring-1 hover:ring-gray-300'
                    }`}
                    style={{ background: t.bg, color: t.text }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Slide preview */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
            {/* Phone frame */}
            <div
              className="w-72 h-96 rounded-3xl shadow-2xl overflow-hidden relative flex flex-col"
              style={{ background: theme.bg }}
            >
              {/* Slide number */}
              <div className="absolute top-4 right-4 text-xs font-bold" style={{ color: theme.number }}>
                {currentIdx + 1}/{slides.length}
              </div>

              {/* Slide content */}
              <div className="flex-1 flex flex-col justify-center px-8 py-10">
                {/* Title */}
                <div
                  className="mb-4 px-3 py-2 rounded-xl cursor-text"
                  style={{ background: theme.accent }}
                  onClick={() => { setEditingTitle(true); setEditingBody(false) }}
                >
                  {editingTitle ? (
                    <textarea
                      autoFocus
                      value={slide.title}
                      onChange={e => updateSlide('title', e.target.value)}
                      onBlur={() => setEditingTitle(false)}
                      className="w-full bg-transparent text-lg font-bold resize-none focus:outline-none"
                      style={{ color: theme.text }}
                      rows={3}
                    />
                  ) : (
                    <p className="text-lg font-bold leading-tight" style={{ color: theme.text }}>
                      {slide.title || 'Titre ici...'}
                    </p>
                  )}
                </div>

                {/* Body */}
                <div
                  className="cursor-text"
                  onClick={() => { setEditingBody(true); setEditingTitle(false) }}
                >
                  {editingBody ? (
                    <textarea
                      autoFocus
                      value={slide.body}
                      onChange={e => updateSlide('body', e.target.value)}
                      onBlur={() => setEditingBody(false)}
                      className="w-full bg-transparent text-sm resize-none focus:outline-none"
                      style={{ color: theme.text, opacity: 0.85 }}
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: theme.text, opacity: 0.85 }}>
                      {slide.body || 'Corps du slide...'}
                    </p>
                  )}
                </div>
              </div>

              {/* Brand footer */}
              <div className="px-8 pb-5">
                <div className="h-px mb-3" style={{ background: theme.accent }} />
                <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: theme.number }}>
                  ContentFlow
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-5">
              <button
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="p-2 rounded-full bg-white shadow border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className="cursor-pointer transition-all rounded-full"
                    style={{
                      width: i === currentIdx ? 20 : 8,
                      height: 8,
                      background: i === currentIdx ? '#7C3AED' : '#d1d5db',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => setCurrentIdx(Math.min(slides.length - 1, currentIdx + 1))}
                disabled={currentIdx === slides.length - 1}
                className="p-2 rounded-full bg-white shadow border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-400 text-center">Clique sur le titre ou le corps pour modifier</p>
          </div>

          {/* Right: Post generator */}
          <div className="w-72 border-l border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Post LinkedIn généré</h3>
              <p className="text-xs text-gray-400">Texte à publier avec ton carousel</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
                {generateLinkedInPost(slides, theme.label)}
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                <p className="text-[11px] text-blue-700 font-medium mb-1">💡 Comment publier</p>
                <p className="text-[10px] text-blue-600 leading-relaxed">
                  1. Exporte chaque slide en image (capture d'écran)<br/>
                  2. Sur LinkedIn → Créer un post → Ajoute les images dans l'ordre<br/>
                  3. Colle le texte ci-dessus
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 space-y-2">
              <button
                onClick={handleCopyPost}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié !' : 'Copier le post'}
              </button>
              {onInsert && (
                <button
                  onClick={handleInsert}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Insérer comme post
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
