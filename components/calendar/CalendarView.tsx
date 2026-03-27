'use client'

import { useState, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  scheduled: { bg: 'rgba(0,119,181,0.1)', color: '#0077B5', dot: '#0077B5' },
  published:  { bg: 'rgba(16,185,129,0.15)', color: '#34D399',  dot: '#34D399' },
  failed:     { bg: 'rgba(239,68,68,0.15)',  color: '#F87171',  dot: '#EF4444' },
  draft:      { bg: '#F8FAFC', color: '#64748B', dot: '#94A3B8' },
}

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
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const dragPostId = useRef<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const navigate = (direction: -1 | 1) => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + direction)
    else d.setDate(d.getDate() + direction * 7)
    setCurrentDate(d)
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
    const days: Array<{ date: Date; currentMonth: boolean }> = []
    for (let i = startOffset - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), currentMonth: false })
    for (let i = 1; i <= lastDay.getDate(); i++) days.push({ date: new Date(year, month, i), currentMonth: true })
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) days.push({ date: new Date(year, month + 1, i), currentMonth: false })
    return days
  }, [year, month])

  const weekDays = useMemo(() => {
    const s = new Date(currentDate)
    const day = s.getDay()
    s.setDate(s.getDate() - day + (day === 0 ? -6 : 1))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s); d.setDate(d.getDate() + i)
      return { date: d, currentMonth: true }
    })
  }, [currentDate])

  const getPostsForDate = (date: Date) => {
    const ds = toLocalDateStr(date)
    return posts.filter(p => p.scheduled_at.startsWith(ds))
  }

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString()

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    dragPostId.current = postId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', postId)
  }
  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverDate(dateStr)
  }
  const handleDragLeave = () => setDragOverDate(null)
  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault(); setDragOverDate(null)
    const id = dragPostId.current || e.dataTransfer.getData('text/plain')
    if (id && onPostReschedule) onPostReschedule(id, dateStr)
    dragPostId.current = null
  }
  const handleDragEnd = () => { setDragOverDate(null); dragPostId.current = null }

  const displayDays = view === 'month' ? calendarDays : weekDays

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px',
        borderBottom: '1px solid #F8FAFC',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20,
            color: '#0F172A', letterSpacing: '-0.02em',
          }}>
            {MONTHS_FR[month]} <span style={{ color: '#64748B', fontWeight: 500, fontSize: 18 }}>{year}</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {([-1, 1] as const).map(dir => (
              <button key={dir} onClick={() => navigate(dir)} style={{
                width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0',
                background: 'rgba(255,255,255,0.03)', color: '#64748B', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,119,181,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,119,181,0.25)'; (e.currentTarget as HTMLElement).style.color = '#0077B5' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.color = '#64748B' }}
              >
                {dir === -1 ? <ChevronLeft style={{ width: 15, height: 15 }} /> : <ChevronRight style={{ width: 15, height: 15 }} />}
              </button>
            ))}
            <button
              onClick={() => setCurrentDate(new Date())}
              style={{
                padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid rgba(0,119,181,0.25)',
                background: 'rgba(0,119,181,0.06)', color: '#0077B5', cursor: 'pointer',
                transition: 'all 0.2s', marginLeft: 4,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,119,181,0.06)' }}
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onPostReschedule && (
            <p style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ opacity: 0.6 }}>🖱️</span> Glisse pour reprogrammer
            </p>
          )}
          {/* View toggle */}
          <div style={{
            display: 'flex', background: '#F1F5F9',
            borderRadius: 10, padding: 3, border: '1px solid #F8FAFC',
          }}>
            {(['week', 'month'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: view === v ? 'rgba(124,58,237,0.25)' : 'transparent',
                color: view === v ? '#0077B5' : '#94A3B8',
                boxShadow: view === v ? '0 0 12px rgba(124,58,237,0.2)' : 'none',
              }}>
                {v === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Day headers ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.015)',
      }}>
        {DAYS_FR.map(day => (
          <div key={day} style={{
            padding: '10px 0', textAlign: 'center',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#4B5563',
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {displayDays.map(({ date, currentMonth }, idx) => {
          const dayPosts = getPostsForDate(date)
          const dateStr = toLocalDateStr(date)
          const today = isToday(date)
          const isDragOver = dragOverDate === dateStr
          const isHovered = hoveredCell === dateStr
          const isLastRow = idx >= displayDays.length - 7
          const isLastCol = (idx + 1) % 7 === 0

          return (
            <div
              key={idx}
              onClick={() => onDayClick(dateStr)}
              onDragOver={e => handleDragOver(e, dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, dateStr)}
              onMouseEnter={() => setHoveredCell(dateStr)}
              onMouseLeave={() => setHoveredCell(null)}
              style={{
                minHeight: view === 'week' ? 140 : 100,
                padding: '10px 8px 8px',
                borderBottom: isLastRow ? 'none' : '1px solid #F1F5F9',
                borderRight: isLastCol ? 'none' : '1px solid #F1F5F9',
                cursor: 'pointer',
                transition: 'background 0.15s',
                background: isDragOver
                  ? 'rgba(0,119,181,0.08)'
                  : today
                    ? 'rgba(124,58,237,0.07)'
                    : isHovered
                      ? 'rgba(255,255,255,0.03)'
                      : !currentMonth
                        ? 'rgba(0,0,0,0.15)'
                        : 'transparent',
                outline: isDragOver ? '1px solid rgba(124,58,237,0.5)' : 'none',
                position: 'relative',
              }}
            >
              {/* Date number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{
                  width: today ? 26 : 'auto',
                  height: today ? 26 : 'auto',
                  borderRadius: today ? '50%' : 0,
                  background: today ? 'linear-gradient(135deg, #0077B5, #3B9FD1)' : 'transparent',
                  boxShadow: today ? '0 0 12px rgba(124,58,237,0.6)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: today ? 700 : 500,
                  color: today ? '#fff' : !currentMonth ? '#374151' : '#64748B',
                }}>
                  {date.getDate()}
                </span>
              </div>

              {/* Posts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {dayPosts.slice(0, view === 'week' ? 8 : 3).map(post => {
                  const s = STATUS_STYLES[post.status] || STATUS_STYLES.draft
                  return (
                    <button
                      key={post.id}
                      draggable={!!onPostReschedule}
                      onDragStart={e => { e.stopPropagation(); handleDragStart(e, post.id) }}
                      onDragEnd={handleDragEnd}
                      onClick={e => { e.stopPropagation(); onPostClick(post) }}
                      style={{
                        width: '100%', textAlign: 'left', fontSize: 10, fontWeight: 500,
                        padding: '3px 6px', borderRadius: 5, border: 'none',
                        background: s.bg, color: s.color,
                        cursor: onPostReschedule ? 'grab' : 'pointer',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: 4,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.2)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none' }}
                    >
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: s.dot, flexShrink: 0,
                      }} />
                      {post.content.replace(/<[^>]+>/g, '').substring(0, 22)}…
                    </button>
                  )
                })}
                {dayPosts.length > (view === 'week' ? 8 : 3) && (
                  <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 600, paddingLeft: 4 }}>
                    +{dayPosts.length - (view === 'week' ? 8 : 3)} autres
                  </span>
                )}
                {isDragOver && (
                  <div style={{
                    fontSize: 10, color: '#0077B5', fontWeight: 700,
                    textAlign: 'center', padding: '4px 0',
                    animation: 'pulse 1s infinite',
                  }}>
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
