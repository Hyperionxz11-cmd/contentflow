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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Nouveau post</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('edit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'edit' ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Écrire
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'preview' ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Preview
          </button>
          {onClose && (
            <button onClick={onClose} className="ml-2 p-1 text-gray-400 hover:text-gray-600">
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
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary-light)] px-3 py-1.5 rounded-lg mb-3 hover:bg-blue-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Utiliser un template
            </button>

            {/* Templates dropdown */}
            {showTemplates && templates.length > 0 && (
              <div className="mb-4 bg-gray-50 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                {templates.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => applyTemplate(t.content)}
                    className="w-full text-left p-3 rounded-lg bg-white border border-gray-100 hover:border-[var(--primary)]/30 transition-colors"
                  >
                    <span className="text-xs font-medium text-[var(--primary)]">{t.category}</span>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{t.content.substring(0, 80)}...</p>
                  </button>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"Écris ton post LinkedIn ici...\n\nAstuce : les posts avec des retours à la ligne et des emojis ont plus d'engagement !"}
              className="w-full min-h-[200px] p-4 border border-gray-200 rounded-xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
              maxLength={3000}
            />
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${content.length > 2800 ? 'text-[var(--danger)]' : 'text-gray-400'}`}>
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
        <div className="flex flex-wrap items-end gap-3 mt-6 pt-6 border-t border-gray-100">
          <div className="flex-1 min-w-[140px]">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
              <Clock className="w-3.5 h-3.5" />
              Heure
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            />
          </div>
          <button
            onClick={() => handleSave(false)}
            disabled={!content.trim() || !scheduledDate}
            className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Programmer
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={!content.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--accent)] hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Publier
          </button>
        </div>
      </div>
    </div>
  )
}
