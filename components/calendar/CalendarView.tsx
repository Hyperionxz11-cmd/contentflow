'use client'

import { useState, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface Post {
  id: string
  content: string
  scheduled_at: string
  status: 'scheduled' | 'published' | 'failed' | 'draft'
}

interface CalendarViewProps {
  posts: Post[]
  onDayClick: (date: string) => void
  onPostClick: (post: Post) => void
  onPostReschedule?: (postId: string, newDate: string) => void
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const statusColors: Record<string, string> = {
  scheduled: 'bg-[var(--primary)] text-white',
  published: 'bg-emerald-500 text-white',
  failed: 'bg-red-500 text-white',
  draft: 'bg-gray-300 text-gray-700',
}

/** Converts a Date to local YYYY-MM-DD string (avoids UTC timezone shift) */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function CalendarView({ posts, onDayClick, onPostClick, onPostReschedule }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const dragPostId = useRef<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const navigate = (direction: -1 | 1) => {
    const d = new Date(currentDate)
    if (view === 'month') {
      d.setMonth(d.getMonth() + direction)
    } else {
      d.setDate(d.getDate() + direction * 7)
    }
    setCurrentDate(d)
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7 // Monday start
    const days: Array<{ date: Date; currentMonth: boolean }> = []

    // Previous month days
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, currentMonth: false })
    }
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), currentMonth: true })
    }
    // Fill remaining to complete grid
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), currentMonth: false })
    }

    return days
  }, [year, month])

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      return { date: d, currentMonth: true }
    })
  }, [currentDate])

  const getPostsForDate = (date: Date): Post[] => {
    const dateStr = toLocalDateStr(date)
    return posts.filter(p => p.scheduled_at.startsWith(dateStr))
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const displayDays = view === 'month' ? calendarDays : weekDays

  // ── Drag & Drop handlers ──────────────────────────────────

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    dragPostId.current = postId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', postId)
  }

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(dateStr)
  }

  const handleDragLeave = () => {
    setDragOverDate(null)
  }

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    setDragOverDate(null)
    const id = dragPostId.current || e.dataTransfer.getData('text/plain')
    if (id && onPostReschedule) {
      onPostReschedule(id, dateStr)
    }
    dragPostId.current = null
  }

  const handleDragEnd = () => {
    setDragOverDate(null)
    dragPostId.current = null
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            {MONTHS_FR[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg transition-colors"
            >
              Aujourd'hui
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onPostReschedule && (
            <p className="text-xs text-gray-400 hidden md:block">
              🖱️ Glisse un post pour le reprogrammer
            </p>
          )}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Semaine
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Mois
            </button>
          </div>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS_FR.map(day => (
          <div key={day} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`grid grid-cols-7 ${view === 'week' ? 'min-h-[200px]' : ''}`}>
        {displayDays.map(({ date, currentMonth }, idx) => {
          const dayPosts = getPostsForDate(date)
          const dateStr = toLocalDateStr(date)
          const isDragOver = dragOverDate === dateStr

          return (
            <div
              key={idx}
              onClick={() => onDayClick(dateStr)}
              onDragOver={e => handleDragOver(e, dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, dateStr)}
              className={`
                min-h-[100px] p-2 border-b border-r border-gray-50 cursor-pointer transition-colors
                hover:bg-blue-50/50
                ${!currentMonth ? 'bg-gray-50/50' : ''}
                ${isToday(date) ? 'bg-blue-50/80' : ''}
                ${isDragOver ? 'bg-violet-100 border-violet-300 border-2 scale-[1.01] transition-transform' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`
                  text-sm font-medium
                  ${isToday(date) ? 'w-7 h-7 bg-[var(--primary)] text-white rounded-full flex items-center justify-center text-xs' : ''}
                  ${!currentMonth ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  {date.getDate()}
                </span>
                {currentMonth && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDayClick(dateStr) }}
                    className="p-0.5 rounded hover:bg-[var(--primary-light)] transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--primary)]" />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, 3).map(post => (
                  <button
                    key={post.id}
                    draggable={!!onPostReschedule}
                    onDragStart={e => { e.stopPropagation(); handleDragStart(e, post.id) }}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => { e.stopPropagation(); onPostClick(post) }}
                    className={`w-full text-left text-[10px] font-medium px-1.5 py-1 rounded truncate transition-transform ${statusColors[post.status]} ${onPostReschedule ? 'cursor-grab active:cursor-grabbing hover:opacity-90 hover:scale-[1.02]' : ''}`}
                    title={onPostReschedule ? 'Glisse pour reprogrammer' : undefined}
                  >
                    {post.content.replace(/<[^>]+>/g, '').substring(0, 25)}...
                  </button>
                ))}
                {dayPosts.length > 3 && (
                  <span className="text-[10px] text-gray-400 font-medium">+{dayPosts.length - 3} autres</span>
                )}
                {isDragOver && (
                  <div className="text-[10px] text-violet-600 font-semibold text-center py-1 animate-pulse">
                    ↓ Déplacer ici
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
