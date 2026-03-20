'use client'

import { useState } from 'react'
import { X, ThumbsUp, MessageSquare, Repeat2, Send, Globe, MoreHorizontal, ChevronDown, ChevronUp, Calendar, CheckCircle2 } from 'lucide-react'

interface LinkedInPreviewProps {
  content: string          // texte brut ou HTML du post
  scheduledAt?: string     // ISO date string
  status?: string
  authorName?: string
  authorHeadline?: string
  authorAvatar?: string    // URL ou base64 de la photo de profil LinkedIn
  images?: string[]        // base64 images extraites du DOCX
  onClose: () => void
}

/** Formate le texte LinkedIn : hashtags en bleu, mentions, emojis */
function formatLinkedInText(text: string) {
  const lines = text.split('\n')
  return lines.map((line, li) => {
    const formatted = line.replace(
      /(#\w[\wÀ-ÿ]*|@\w[\wÀ-ÿ]*)/g,
      '<span class="text-[#0a66c2] font-medium">$1</span>'
    )
    return (
      <span key={li}>
        <span dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />
        {li < lines.length - 1 && <br />}
      </span>
    )
  })
}

/** Supprime les lignes de structure DOCX (ALL CAPS, Semaine X —) qui ne doivent pas apparaître */
function stripDocxHeaders(text: string): string {
  return text
    .split('\n')
    .filter(line => {
      const t = line.trim()
      if (!t) return true
      if (t.length >= 3 && t === t.toUpperCase() && /[A-ZÀÂÇÈÉÊËÎÏÔÙÛŒ]{3,}/.test(t)) return false
      if (/^Semaine\s+\d+\s*[—–-]/i.test(t)) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Nettoie le texte : supprime balises HTML résiduelles, extrait les src d'images (vraies images uniquement) */
function cleanTextAndImages(raw: string): { text: string; imgs: string[] } {
  const imgs: string[] = []
  if (typeof window !== 'undefined') {
    const div = document.createElement('div')
    div.innerHTML = raw
    // Extraire uniquement les vraies images (pas les PDF/doc/zip)
    div.querySelectorAll('img').forEach(el => {
      const src = el.getAttribute('src')
      if (src) {
        const isDataImage = src.startsWith('data:image/')
        const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(src)
        const isHttpImage = src.startsWith('http') &&
          !/\.(pdf|doc|docx|xls|xlsx|zip|rar|ppt|pptx|txt|xml)(\?.*)?$/i.test(src)
        if (isDataImage || isImageUrl || isHttpImage) imgs.push(src)
      }
      el.remove()
    })
    div.querySelectorAll('p, br, h1, h2, h3').forEach(el => {
      el.insertAdjacentText('afterend', '\n')
    })
    const rawText = (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
    return { text: stripDocxHeaders(rawText), imgs }
  }
  return { text: stripDocxHeaders(raw.replace(/<[^>]+>/g, '').trim()), imgs }
}

export default function LinkedInPreview({
  content,
  scheduledAt,
  status,
  authorName = 'André Isoz',
  authorHeadline = 'Conseiller financier | Brevet Fédéral',
  authorAvatar,
  images = [],
  onClose,
}: LinkedInPreviewProps) {
  const [expanded, setExpanded] = useState(false)

  const { text: cleanContent, imgs: inlineImgs } = cleanTextAndImages(content)
  // Merge: images prop (from DB) + inline images from HTML content
  const allImages = [...(images || []), ...inlineImgs].filter(Boolean)

  const lines = cleanContent.split('\n')
  const previewLines = 5
  const isLong = lines.length > previewLines
  const displayedText = !expanded && isLong
    ? lines.slice(0, previewLines).join('\n') + '…'
    : cleanContent

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null
  const formattedDate = scheduledDate
    ? scheduledDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const formattedTime = scheduledDate
    ? scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null

  const initials = authorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="w-full max-w-[550px] flex flex-col gap-3 max-h-[90vh] overflow-y-auto">

        {/* Header modal */}
        <div className="flex items-center justify-between px-1">
          <p className="text-white text-sm font-semibold">Aperçu LinkedIn</p>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bannière programmation */}
        {scheduledDate && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
            status === 'published' ? 'bg-emerald-500 text-white' : 'bg-[#0a66c2] text-white'
          }`}>
            {status === 'published'
              ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              : <Calendar className="w-5 h-5 flex-shrink-0" />
            }
            <div>
              <p className="font-semibold">
                {status === 'published' ? 'Publié le' : 'Programmé pour le'}{' '}
                {formattedDate}
              </p>
              <p className="text-white/80 text-xs">à {formattedTime}</p>
            </div>
          </div>
        )}

        {/* Carte LinkedIn */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Post header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {/* Avatar — photo réelle ou initiales */}
                {authorAvatar ? (
                  <img
                    src={authorAvatar}
                    alt={authorName}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0a66c2] to-blue-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{authorName}</p>
                  <p className="text-xs text-gray-500 leading-tight mt-0.5 max-w-[280px]">{authorHeadline}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-400">1 h</span>
                    <span className="text-gray-300">·</span>
                    <Globe className="w-3 h-3 text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1.5 text-[#0a66c2] text-sm font-semibold border border-[#0a66c2] rounded-full hover:bg-blue-50 transition-colors">
                  + Suivre
                </button>
                <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Post content */}
          <div className="px-4 pb-3">
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {formatLinkedInText(displayedText)}
            </div>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-gray-500 text-xs mt-2 hover:text-gray-700 font-medium"
              >
                {expanded
                  ? <><ChevronUp className="w-3.5 h-3.5" /> Voir moins</>
                  : <><ChevronDown className="w-3.5 h-3.5" /> Voir plus</>
                }
              </button>
            )}
          </div>

          {/* Images du post (extraites du DOCX) */}
          {allImages.length > 0 && (
            <div className={`px-4 pb-3 grid gap-2 ${allImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {allImages.slice(0, 4).map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt={`Image ${i + 1}`}
                    className="w-full rounded-lg object-cover border border-gray-100"
                    style={{ maxHeight: allImages.length === 1 ? '400px' : '200px' }}
                  />
                  {i === 3 && allImages.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg font-bold">+{allImages.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reactions counter */}
          <div className="px-4 pb-2 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <span className="flex -space-x-1">
                <span className="w-5 h-5 rounded-full bg-[#0a66c2] flex items-center justify-center text-[10px]">👍</span>
                <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px]">❤️</span>
              </span>
              <span>24</span>
            </div>
            <span>3 commentaires</span>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-gray-100" />

          {/* Action buttons */}
          <div className="px-2 py-1 grid grid-cols-4">
            {[
              { icon: ThumbsUp, label: 'Réagir' },
              { icon: MessageSquare, label: 'Commenter' },
              { icon: Repeat2, label: 'Republier' },
              { icon: Send, label: 'Envoyer' },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex flex-col items-center gap-1 py-2.5 px-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Info caractères */}
        <div className="text-center text-white/60 text-xs">
          {cleanContent.length} caractères · LinkedIn recommande moins de 1 300 car. pour un bon taux d'engagement
          {cleanContent.length > 1300 && (
            <span className="ml-2 text-amber-300 font-medium">⚠ post long — pensez à ajouter «…voir plus»</span>
          )}
          {allImages.length > 0 && (
            <span className="ml-2 text-blue-300 font-medium">🖼 {allImages.length} image{allImages.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  )
}
