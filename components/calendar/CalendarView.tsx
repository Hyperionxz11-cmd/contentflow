'use client'

import { useState, useMemo } from 'react'
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
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const statusColors: Record<string, string> = {
  scheduled: 'bg-[rgba(124,58,237,0.2)] text-[#A78BFA]',
  published: 'bg-[rgba(16,185,129,0.2)] text-[#6EE7B7]',
  failed: 'bg-[rgba(239,68,68,0.2)] text-[#FCA5A5]',
  draft: 'bg-[rgba(255,255,255,0.07)] text-[#A1A1AA]',
}

export default function CalendarView({ posts, onDayClick, onPostClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')

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
    const dateStr = date.toISOString().split('T')[0]
    return posts.filter(p => p.scheduled_at.startsWith(dateStr))
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const displayDays = view === 'month' ? calendarDays : weekDays

  return (
    <div className="bg-[#111116] rounded-xl border border-[rgba(255,255,255,0.07)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-[#FAFAFA]" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
            {MONTHS_FR[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#71717A]" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-medium text-[#A78BFA] border border-[#7C3AED] hover:bg-[rgba(124,58,237,0.1)] rounded-lg transition-colors"
            >
              Aujourd'hui
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              <ChevronRight className="w-5 h-5 text-[#71717A]" />
            </button>
          </div>
        </div>
        <div className="flex gap-1 bg-[#1C1C24] rounded-lg p-1">
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'week' ? 'bg-[#17171E] text-[#FAFAFA] shadow-sm' : 'text-[#71717A]'}`}
          >
            Semaine
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'month' ? 'bg-[#17171E] text-[#FAFAFA] shadow-sm' : 'text-[#71717A]'}`}
          >
            Mois
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[rgba(255,255,255,0.07)]">
        {DAYS_FR.map(day => (
          <div key={day} className="py-3 text-center text-xs font-semibold text-[#71717A] uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`grid grid-cols-7 ${view === 'week' ? 'min-h-[200px]' : ''}`}>
        {displayDays.map(({ date, currentMonth }, idx) => {
          const dayPosts = getPostsForDate(date)
          const dateStr = date.toISOString().split('T')[0]

          return (
            <div
              key={idx}
              onClick={() => onDayClick(dateStr)}
              className={`
                min-h-[100px] p-2 border-b border-r border-[rgba(255,255,255,0.04)] cursor-pointer transition-colors
                hover:bg-[rgba(255,255,255,0.03)]
                ${!currentMonth ? 'bg-[rgba(255,255,255,0.01)]' : ''}
                ${isToday(date) ? 'bg-[rgba(124,58,237,0.08)]' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`
                  text-sm font-medium
                  ${isToday(date) ? 'w-7 h-7 bg-[#7C3AED] text-[#FAFAFA] rounded-full flex items-center justify-center' : ''}
                  ${!currentMonth ? 'text-[#3F3F46]' : 'text-[#FAFAFA]'}
                `}>
                  {date.getDate()}
                </span>
                {currentMonth && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDayClick(dateStr) }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[rgba(124,58,237,0.15)] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#7C3AED]" />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, 3).map(post => (
                  <button
                    key={post.id}
                    onClick={(e) => { e.stopPropagation(); onPostClick(post) }}
                    className={`w-full text-left text-[10px] font-medium px-1.5 py-1 rounded truncate ${statusColors[post.status]}`}
                  >
                    {post.content.substring(0, 25)}...
                  </button>
                ))}
                {dayPosts.length > 3 && (
                  <span className="text-[10px] text-[#71717A] font-medium">+{dayPosts.length - 3} autres</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
