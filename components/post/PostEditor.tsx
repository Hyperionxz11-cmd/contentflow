'use client'

import { useState } from 'react'
import { Calendar, Clock, Send, Sparkles, X } from 'lucide-react'
import LinkedInPreview from './LinkedInPreview'

interface PostEditorProps {
  onSave: (post: { content: string; scheduledAt: string; status: string }) => void
  onClose?: () => void
  initialDate?: string
  templates?: Array<{ title: string; content: string; category: string }>
}

export default function PostEditor({ onSave, onClose, initialDate, templates = [] }: PostEditorProps) {
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
    onSave({
      content: content.trim(),
      scheduledAt,
      status: publishNow ? 'publish_now' : 'scheduled',
    })
    setContent('')
  }

  const applyTemplate = (templateContent: string) => {
    setContent(templateContent)
    setShowTemplates(false)
  }

  return (
    <div className="bg-[#17171E] rounded-xl border border-[rgba(255,255,255,0.1)] shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.07)]">
        <h3 className="text-lg font-bold text-[#FAFAFA]" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          Nouveau post
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('edit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'edit' ? 'bg-[rgba(124,58,237,0.2)] text-[#A78BFA]' : 'text-[#71717A] hover:text-[#A1A1AA]'}`}
          >
            Écrire
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'preview' ? 'bg-[rgba(124,58,237,0.2)] text-[#A78BFA]' : 'text-[#71717A] hover:text-[#A1A1AA]'}`}
          >
            Preview
          </button>
          {onClose && (
            <button onClick={onClose} className="ml-2 p-1 text-[#71717A] hover:text-[#A1A1AA]">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {mode === 'edit' ? (
          <>
            {/* Template button */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A78BFA] bg-[rgba(124,58,237,0.15)] px-3 py-1.5 rounded-lg mb-3 hover:bg-[rgba(124,58,237,0.25)] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Utiliser un template
            </button>

            {/* Templates dropdown */}
            {showTemplates && templates.length > 0 && (
              <div className="mb-4 bg-[#1C1C24] rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto border border-[rgba(255,255,255,0.07)]">
                {templates.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => applyTemplate(t.content)}
                    className="w-full text-left p-3 rounded-lg bg-[#111116] border border-[rgba(255,255,255,0.07)] hover:border-[#7C3AED] transition-colors"
                  >
                    <span className="text-xs font-medium text-[#A78BFA]">{t.category}</span>
                    <p className="text-sm font-semibold text-[#FAFAFA] mt-0.5">{t.title}</p>
                    <p className="text-xs text-[#71717A] mt-0.5 truncate">{t.content.substring(0, 80)}...</p>
                  </button>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"Écris ton post LinkedIn ici...\n\nAstuce : les posts avec des retours à la ligne et des emojis ont plus d'engagement !"}
              className="w-full min-h-[200px] p-4 bg-[#111116] border border-[rgba(255,255,255,0.07)] rounded-xl text-sm text-[#FAFAFA] resize-y focus:outline-none focus:ring-2 focus:ring-[rgba(124,58,237,0.2)] focus:border-[#7C3AED] transition-all placeholder-[#3F3F46]"
              style={{ fontFamily: 'DM Mono, monospace' }}
              maxLength={3000}
            />
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs font-medium ${content.length > 2800 ? 'text-[#EF4444]' : 'text-[#71717A]'}`} style={{ fontFamily: 'DM Mono, monospace' }}>
                {content.length} / 3000
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-center py-4">
            <LinkedInPreview content={content} />
          </div>
        )}

        {/* Schedule */}
        <div className="flex flex-wrap items-end gap-3 mt-6 pt-6 border-t border-[rgba(255,255,255,0.07)]">
          <div className="flex-1 min-w-[140px]">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#71717A] mb-1.5 uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5" />
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 bg-[#111116] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[rgba(124,58,237,0.2)] focus:border-[#7C3AED] transition-all"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#71717A] mb-1.5 uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5" />
              Heure
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#111116] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[rgba(124,58,237,0.2)] focus:border-[#7C3AED] transition-all"
            />
          </div>
          <button
            onClick={() => handleSave(false)}
            disabled={!content.trim() || !scheduledDate}
            className="px-5 py-2.5 border border-[#7C3AED] text-[#A78BFA] text-sm font-semibold rounded-lg hover:bg-[rgba(124,58,237,0.1)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Programmer
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={!content.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-[#FAFAFA] text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Publier
          </button>
        </div>
      </div>
    </div>
  )
}
