'use client'

import { ThumbsUp, MessageCircle, Repeat2, Send } from 'lucide-react'

interface LinkedInPreviewProps {
  content: string
  authorName?: string
  authorTitle?: string
  authorAvatar?: string
}

export default function LinkedInPreview({ content, authorName = 'Ton Nom', authorTitle = 'Ton titre LinkedIn', authorAvatar }: LinkedInPreviewProps) {
  const formatContent = (text: string) => {
    if (!text) return <span className="text-gray-300 italic">Écris quelque chose pour voir la preview...</span>
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-md">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-200"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0A66C2] to-blue-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">{authorName}</p>
          <p className="text-xs text-gray-500 truncate">{authorTitle}</p>
          <p className="text-xs text-gray-400 mt-0.5">Maintenant · 🌐</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
          {formatContent(content)}
        </p>
      </div>

      {/* Stats */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span className="flex -space-x-1">
            <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px]">👍</span>
            <span className="w-4 h-4 rounded-full bg-red-400 flex items-center justify-center text-white text-[8px]">❤️</span>
          </span>
          <span className="ml-1">24</span>
          <span className="ml-auto">3 commentaires · 1 partage</span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 px-2 py-1 flex items-center justify-around">
        {[
          { icon: ThumbsUp, label: "J'aime" },
          { icon: MessageCircle, label: 'Commenter' },
          { icon: Repeat2, label: 'Partager' },
          { icon: Send, label: 'Envoyer' },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
