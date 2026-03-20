'use client'

import { useState } from 'react'
import { Calendar, Clock, Send, Sparkles, X } from 'lucide-react'
import LinkedInPreview from './LinkedInPreview'

interface PostEditorProps {
  onSave: (post: { content: string; scheduledAt: string; status: string }) => void
  onClose?: () => void
  initialDate?: string
  templates?: Array<{ title: string; content: string; category: string }>
  authorAvatar?: string
  authorName?: string
}

const font = "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export default function PostEditor({ onSave, onClose, initialDate, templates = [], authorAvatar, authorName }: PostEditorProps) {
  const [content, setContent] = useState('')
  const [scheduledDate, setScheduledDate] = useState(initialDate || '')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [showTemplates, setShowTemplates] = useState(false)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  const handleSave = (publishNow: boolean) => {
    if (!content.trim()) return
    const scheduledAt = publishNow
      ? new Date().toISOString()
      : new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
    onSave({ content: content.trim(), scheduledAt, status: publishNow ? 'publish_now' : 'scheduled' })
    setContent('')
  }

  const applyTemplate = (templateContent: string) => {
    setContent(templateContent)
    setShowTemplates(false)
  }

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '8px',
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      fontFamily: font,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}>
        <h3 style={{ fontFamily: font, fontWeight: 700, fontSize: '15px', color: 'rgba(0,0,0,0.9)', margin: 0 }}>
          Nouveau post
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(['edit', 'preview'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '5px 12px', borderRadius: '9999px',
                border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600, fontFamily: font,
                background: mode === m ? 'rgba(10,102,194,0.1)' : 'transparent',
                color: mode === m ? '#0A66C2' : 'rgba(0,0,0,0.45)',
                transition: 'all 150ms',
              }}
            >
              {m === 'edit' ? 'Écrire' : 'Preview'}
            </button>
          ))}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                marginLeft: '4px', width: '28px', height: '28px', borderRadius: '50%',
                border: 'none', background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(0,0,0,0.4)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 18px' }}>
        {mode === 'edit' ? (
          <>
            {/* Template button */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '9999px',
                border: '1px solid rgba(10,102,194,0.3)',
                background: showTemplates ? 'rgba(10,102,194,0.08)' : 'transparent',
                color: '#0A66C2', fontSize: '12px', fontWeight: 600, fontFamily: font,
                cursor: 'pointer', marginBottom: '12px', transition: 'all 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(10,102,194,0.08)')}
              onMouseLeave={e => { if (!showTemplates) e.currentTarget.style.background = 'transparent' }}
            >
              <Sparkles style={{ width: '13px', height: '13px' }} />
              Utiliser un template
            </button>

            {/* Templates dropdown */}
            {showTemplates && templates.length > 0 && (
              <div style={{
                marginBottom: '14px',
                background: '#F3F2EF',
                borderRadius: '6px',
                padding: '10px',
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid rgba(0,0,0,0.08)',
                display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                {templates.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => applyTemplate(t.content)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '10px 12px', borderRadius: '6px',
                      border: '1px solid rgba(0,0,0,0.08)',
                      background: '#FFFFFF', cursor: 'pointer',
                      transition: 'border-color 150ms',
                      fontFamily: font,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#0A66C2')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)')}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0A66C2', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t.category}
                    </span>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(0,0,0,0.85)', margin: '2px 0' }}>{t.title}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.45)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.content.substring(0, 80)}...
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={"Écris ton post LinkedIn ici...\n\nAstuce : les posts avec des retours à la ligne et des emojis ont plus d'engagement !"}
              maxLength={3000}
              style={{
                width: '100%', minHeight: '200px',
                padding: '12px 14px',
                border: '1px solid rgba(0,0,0,0.35)',
                borderRadius: '4px',
                fontSize: '14px', lineHeight: 1.6,
                color: 'rgba(0,0,0,0.85)',
                background: '#FFFFFF',
                resize: 'vertical', outline: 'none',
                fontFamily: font,
                transition: 'border 150ms',
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.currentTarget.style.border = '2px solid #0A66C2')}
              onBlur={e => (e.currentTarget.style.border = '1px solid rgba(0,0,0,0.35)')}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <span style={{
                fontSize: '11px', fontFamily: 'monospace',
                color: content.length > 2800 ? '#DC2626' : 'rgba(0,0,0,0.35)',
              }}>
                {content.length} / 3000
              </span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
            <LinkedInPreview content={content} authorAvatar={authorAvatar} authorName={authorName} />
          </div>
        )}

        {/* Schedule section */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '10px',
          marginTop: '16px', paddingTop: '16px',
          borderTop: '1px solid rgba(0,0,0,0.08)',
        }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 700, fontFamily: font,
              color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase',
              letterSpacing: '0.06em', marginBottom: '6px',
            }}>
              <Calendar style={{ width: '12px', height: '12px' }} /> Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%', padding: '9px 12px',
                border: '1px solid rgba(0,0,0,0.35)', borderRadius: '4px',
                fontSize: '13px', fontFamily: font, color: 'rgba(0,0,0,0.85)',
                background: '#FFFFFF', outline: 'none', boxSizing: 'border-box',
                transition: 'border 150ms',
              }}
              onFocus={e => (e.currentTarget.style.border = '2px solid #0A66C2')}
              onBlur={e => (e.currentTarget.style.border = '1px solid rgba(0,0,0,0.35)')}
            />
          </div>

          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 700, fontFamily: font,
              color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase',
              letterSpacing: '0.06em', marginBottom: '6px',
            }}>
              <Clock style={{ width: '12px', height: '12px' }} /> Heure
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px',
                border: '1px solid rgba(0,0,0,0.35)', borderRadius: '4px',
                fontSize: '13px', fontFamily: font, color: 'rgba(0,0,0,0.85)',
                background: '#FFFFFF', outline: 'none', boxSizing: 'border-box',
                transition: 'border 150ms',
              }}
              onFocus={e => (e.currentTarget.style.border = '2px solid #0A66C2')}
              onBlur={e => (e.currentTarget.style.border = '1px solid rgba(0,0,0,0.35)')}
            />
          </div>

          <button
            onClick={() => handleSave(false)}
            disabled={!content.trim() || !scheduledDate}
            style={{
              padding: '9px 18px', borderRadius: '9999px',
              border: '1px solid #0A66C2', background: 'transparent',
              color: '#0A66C2', fontSize: '14px', fontWeight: 700, fontFamily: font,
              cursor: !content.trim() || !scheduledDate ? 'not-allowed' : 'pointer',
              opacity: !content.trim() || !scheduledDate ? 0.4 : 1,
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { if (content.trim() && scheduledDate) e.currentTarget.style.background = 'rgba(10,102,194,0.06)' }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Programmer
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={!content.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', borderRadius: '9999px',
              border: 'none', background: '#0A66C2', color: '#FFFFFF',
              fontSize: '14px', fontWeight: 700, fontFamily: font,
              cursor: !content.trim() ? 'not-allowed' : 'pointer',
              opacity: !content.trim() ? 0.4 : 1,
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { if (content.trim()) e.currentTarget.style.background = '#004182' }}
            onMouseLeave={e => (e.currentTarget.style.background = '#0A66C2')}
          >
            <Send style={{ width: '14px', height: '14px' }} />
            Publier
          </button>
        </div>
      </div>
    </div>
  )
}
