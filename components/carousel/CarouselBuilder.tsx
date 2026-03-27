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

  const SF = '-apple-system, "SF Pro Display", BlinkMacSystemFont, "Helvetica Neue", sans-serif'

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', zIndex:70, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', fontFamily:SF }}>
      <div style={{ background:'#fff', borderRadius:'28px', boxShadow:'0 48px 96px -24px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)', width:'100%', maxWidth:'960px', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 28px 18px', borderBottom:'1px solid rgba(0,0,0,0.06)', flexShrink:0 }}>
          <div>
            <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#0A66C2', margin:'0 0 4px' }}>ContentFlow</p>
            <h2 style={{ fontSize:'22px', fontWeight:700, letterSpacing:'-0.4px', color:'#1d1d1f', margin:0, lineHeight:1.1 }}>
              Carousel Builder
            </h2>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'12px', color:'#86868b' }}>{slides.length} slide{slides.length > 1 ? 's' : ''}</span>
            <button onClick={onClose}
              style={{ width:'32px', height:'32px', borderRadius:'50%', background:'#f2f2f7', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#86868b' }}>
              <X style={{ width:'16px', height:'16px' }} />
            </button>
          </div>
        </div>

        {/* ── BODY (3 columns) ── */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* ── LEFT: slides list + regen ── */}
          <div style={{ width:'220px', borderRight:'1px solid rgba(0,0,0,0.06)', display:'flex', flexDirection:'column', flexShrink:0 }}>

            {/* Regen input */}
            <div style={{ padding:'14px', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
              {showTextInput ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:'#86868b', margin:0 }}>Texte source</p>
                  <textarea value={inputText} onChange={e => setInputText(e.target.value)}
                    placeholder="Colle ton contenu LinkedIn..."
                    style={{ width:'100%', fontSize:'12px', color:'#1d1d1f', background:'#f5f5f7', border:'none', borderRadius:'12px', padding:'10px', resize:'none', outline:'none', fontFamily:'ui-monospace, monospace', lineHeight:1.5, height:'88px', boxSizing:'border-box' }} />
                  <button onClick={handleRegenerate} disabled={!inputText.trim()}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'9px', background: inputText.trim() ? '#0A66C2' : '#d1d1d6', color:'#fff', fontSize:'12px', fontWeight:600, border:'none', borderRadius:'999px', cursor: inputText.trim() ? 'pointer' : 'not-allowed' }}>
                    <RefreshCw style={{ width:'12px', height:'12px' }} /> Générer
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowTextInput(true)}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'9px', background:'rgba(10,102,194,0.07)', color:'#0A66C2', fontSize:'12px', fontWeight:600, border:'none', borderRadius:'999px', cursor:'pointer' }}>
                  <RefreshCw style={{ width:'12px', height:'12px' }} /> Régénérer
                </button>
              )}
            </div>

            {/* Slide list */}
            <div style={{ flex:1, overflowY:'auto', padding:'10px', display:'flex', flexDirection:'column', gap:'6px' }}>
              {slides.map((s, i) => (
                <div key={s.id} onClick={() => { setCurrentIdx(i); setEditingTitle(false); setEditingBody(false) }}
                  style={{ position:'relative', padding:'10px 12px', borderRadius:'14px', cursor:'pointer', background: i === currentIdx ? '#fff' : '#f5f5f7', boxShadow: i === currentIdx ? '0 2px 10px rgba(0,0,0,0.08), 0 0 0 2px rgba(10,102,194,0.25)' : 'none', transition:'all 0.15s' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'6px' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color: i === currentIdx ? '#0A66C2' : '#86868b', margin:'0 0 3px' }}>Slide {i + 1}</p>
                      <p style={{ fontSize:'12px', fontWeight:600, color:'#1d1d1f', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.title || '(vide)'}</p>
                      {s.body && <p style={{ fontSize:'11px', color:'#86868b', margin:'2px 0 0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.body}</p>}
                    </div>
                    {slides.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); deleteSlide(i) }}
                        style={{ width:'22px', height:'22px', borderRadius:'50%', background:'rgba(255,59,48,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#ff3b30', flexShrink:0, opacity:0 }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0'}>
                        <Trash2 style={{ width:'11px', height:'11px' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {slides.length < 10 && (
                <button onClick={addSlide}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', padding:'10px', background:'none', border:'1.5px dashed #d1d1d6', borderRadius:'14px', color:'#86868b', fontSize:'12px', fontWeight:500, cursor:'pointer' }}>
                  <Plus style={{ width:'13px', height:'13px' }} /> Ajouter
                </button>
              )}
            </div>

            {/* Theme selector */}
            <div style={{ padding:'12px', borderTop:'1px solid rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize:'10px', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'#86868b', margin:'0 0 8px' }}>Thème</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                {THEMES.map((t, i) => (
                  <button key={t.id} onClick={() => setThemeIdx(i)}
                    style={{ padding:'8px 6px', borderRadius:'12px', border: i === themeIdx ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent', background:t.bg, color:t.text, fontSize:'10px', fontWeight:700, cursor:'pointer', boxShadow: i === themeIdx ? '0 0 0 2px #0A66C2' : 'none', transition:'all 0.15s' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── CENTER: preview ── */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', background:'#f5f5f7' }}>

            {/* Slide card */}
            <div style={{ width:'288px', height:'384px', borderRadius:'28px', boxShadow:'0 24px 64px -16px rgba(0,0,0,0.28)', overflow:'hidden', position:'relative', display:'flex', flexDirection:'column', background:theme.bg, flexShrink:0 }}>
              <div style={{ position:'absolute', top:'14px', right:'16px', fontSize:'11px', fontWeight:700, color:theme.number }}>
                {currentIdx + 1}/{slides.length}
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'32px 28px 20px' }}>
                <div style={{ marginBottom:'16px', padding:'10px 14px', borderRadius:'14px', background:theme.accent, cursor:'text' }}
                  onClick={() => { setEditingTitle(true); setEditingBody(false) }}>
                  {editingTitle ? (
                    <textarea autoFocus value={slide.title} onChange={e => updateSlide('title', e.target.value)} onBlur={() => setEditingTitle(false)}
                      style={{ width:'100%', background:'transparent', fontSize:'18px', fontWeight:700, border:'none', outline:'none', resize:'none', color:theme.text, fontFamily:SF, lineHeight:1.3 }} rows={3} />
                  ) : (
                    <p style={{ fontSize:'18px', fontWeight:700, color:theme.text, margin:0, lineHeight:1.3 }}>{slide.title || 'Titre ici…'}</p>
                  )}
                </div>
                <div style={{ cursor:'text' }} onClick={() => { setEditingBody(true); setEditingTitle(false) }}>
                  {editingBody ? (
                    <textarea autoFocus value={slide.body} onChange={e => updateSlide('body', e.target.value)} onBlur={() => setEditingBody(false)}
                      style={{ width:'100%', background:'transparent', fontSize:'13px', border:'none', outline:'none', resize:'none', color:theme.text, opacity:0.82, fontFamily:SF, lineHeight:1.5 }} rows={4} />
                  ) : (
                    <p style={{ fontSize:'13px', color:theme.text, opacity:0.82, margin:0, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{slide.body || 'Corps du slide…'}</p>
                  )}
                </div>
              </div>
              <div style={{ padding:'0 28px 18px' }}>
                <div style={{ height:'1px', background:theme.accent, marginBottom:'10px' }} />
                <p style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:theme.number, margin:0 }}>ContentFlow</p>
              </div>
            </div>

            {/* Nav */}
            <div style={{ display:'flex', alignItems:'center', gap:'16px', marginTop:'20px' }}>
              <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}
                style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#fff', border:'none', boxShadow:'0 2px 8px rgba(0,0,0,0.12)', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#48484a', opacity: currentIdx === 0 ? 0.3 : 1 }}>
                <ChevronLeft style={{ width:'18px', height:'18px' }} />
              </button>
              <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                {slides.map((_, i) => (
                  <div key={i} onClick={() => setCurrentIdx(i)} style={{ width: i === currentIdx ? 20 : 7, height:7, borderRadius:'999px', background: i === currentIdx ? '#0A66C2' : '#c7c7cc', cursor:'pointer', transition:'all 0.2s' }} />
                ))}
              </div>
              <button onClick={() => setCurrentIdx(Math.min(slides.length - 1, currentIdx + 1))} disabled={currentIdx === slides.length - 1}
                style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#fff', border:'none', boxShadow:'0 2px 8px rgba(0,0,0,0.12)', cursor: currentIdx === slides.length - 1 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#48484a', opacity: currentIdx === slides.length - 1 ? 0.3 : 1 }}>
                <ChevronRight style={{ width:'18px', height:'18px' }} />
              </button>
            </div>
            <p style={{ marginTop:'12px', fontSize:'11px', color:'#86868b' }}>Clique sur le titre ou le texte pour modifier</p>
          </div>

          {/* ── RIGHT: post preview + actions ── */}
          <div style={{ width:'260px', borderLeft:'1px solid rgba(0,0,0,0.06)', display:'flex', flexDirection:'column', flexShrink:0 }}>
            <div style={{ padding:'18px 18px 14px', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'#86868b', margin:'0 0 4px' }}>Post LinkedIn</p>
              <p style={{ fontSize:'13px', fontWeight:700, color:'#1d1d1f', margin:0 }}>Texte à publier</p>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'14px' }}>
              <div style={{ background:'#f5f5f7', borderRadius:'16px', padding:'14px', fontSize:'12px', color:'#3a3a3c', lineHeight:1.6, whiteSpace:'pre-wrap', fontFamily:'ui-monospace, monospace' }}>
                {generateLinkedInPost(slides, theme.label)}
              </div>
              <div style={{ marginTop:'12px', padding:'12px 14px', background:'rgba(10,102,194,0.05)', borderRadius:'14px' }}>
                <p style={{ fontSize:'11px', fontWeight:600, color:'#0A66C2', margin:'0 0 6px' }}>Comment publier</p>
                <p style={{ fontSize:'11px', color:'#86868b', lineHeight:1.5, margin:0 }}>
                  1. Capture chaque slide<br/>
                  2. LinkedIn → Créer un post → Ajoute les images<br/>
                  3. Colle le texte ci-dessus
                </p>
              </div>
            </div>
            <div style={{ padding:'14px', borderTop:'1px solid rgba(0,0,0,0.06)', display:'flex', flexDirection:'column', gap:'8px' }}>
              <button onClick={handleCopyPost}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'11px', background:'#f5f5f7', color: copied ? '#22c55e' : '#1d1d1f', fontSize:'13px', fontWeight:600, border:'none', borderRadius:'999px', cursor:'pointer' }}>
                {copied ? <Check style={{ width:'15px', height:'15px' }} /> : <Copy style={{ width:'15px', height:'15px' }} />}
                {copied ? 'Copié !' : 'Copier le post'}
              </button>
              {onInsert && (
                <button onClick={handleInsert}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'11px', background:'#0A66C2', color:'#fff', fontSize:'13px', fontWeight:600, border:'none', borderRadius:'999px', cursor:'pointer' }}>
                  <Check style={{ width:'15px', height:'15px' }} />
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
