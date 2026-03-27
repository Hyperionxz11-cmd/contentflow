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
  scheduled: 'bg-[#0A66C2] text-white',
  published: 'bg-[#057642] text-white',
  failed: 'bg-[#CC1016] text-white',
  draft: 'bg-gray-200 text-gray-600',
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

  const font = "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

  return (
    <div style={{background:'#FFFFFF',border:'1px solid rgba(0,0,0,0.08)',borderRadius:'8px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',fontFamily:font}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <h2 style={{fontWeight:700,fontSize:'18px',color:'rgba(0,0,0,0.9)',margin:0,letterSpacing:'-0.01em',fontFamily:font}}>
            {MONTHS_FR[month]} {year}
          </h2>
          <div style={{display:'flex',alignItems:'center',gap:'2px'}}>
            <button onClick={() => navigate(-1)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(0,0,0,0.55)',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <ChevronLeft style={{width:'16px',height:'16px'}} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} style={{padding:'4px 12px',borderRadius:'9999px',border:'1px solid #0A66C2',background:'transparent',color:'#0A66C2',fontSize:'12px',fontWeight:600,fontFamily:font,cursor:'pointer',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(10,102,194,0.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {"Aujourd'hui"}
            </button>
            <button onClick={() => navigate(1)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(0,0,0,0.55)',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <ChevronRight style={{width:'16px',height:'16px'}} />
            </button>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          {onPostReschedule && (
            <p style={{fontSize:'11px',color:'rgba(0,0,0,0.4)'}}>🖱️ Glisse pour reprogrammer</p>
          )}
          <div style={{display:'flex',gap:'2px',background:'rgba(0,0,0,0.05)',borderRadius:'9999px',padding:'3px'}}>
            {(['week','month'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{padding:'5px 14px',borderRadius:'9999px',border:'none',fontSize:'12px',fontWeight:600,fontFamily:font,cursor:'pointer',transition:'all 150ms',background:view===v?'#FFFFFF':'transparent',color:view===v?'rgba(0,0,0,0.9)':'rgba(0,0,0,0.5)',boxShadow:view===v?'0 1px 3px rgba(0,0,0,0.12)':'none'}}
              >
                {v==='week'?'Semaine':'Mois'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Day headers */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',borderBottom:'1px solid rgba(0,0,0,0.08)',background:'#FAFAFA'}}>
        {DAYS_FR.map(day => (
          <div key={day} style={{padding:'10px 0',textAlign:'center',fontSize:'11px',fontWeight:700,color:'rgba(0,0,0,0.4)',letterSpacing:'0.05em',textTransform:'uppercase',fontFamily:font}}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)'}}>
        {displayDays.map(({ date, currentMonth }, idx) => {
          const dayPosts = getPostsForDate(date)
          const dateStr = toLocalDateStr(date)
          const today = isToday(date)
          const isDragOver = dragOverDate === dateStr

          return (
            <div
              key={idx}
              onClick={() => onDayClick(dateStr)}
              onDragOver={e => handleDragOver(e, dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, dateStr)}
              style={{
                minHeight:view==='week'?'160px':'100px',
                padding:'8px',
                borderBottom:'1px solid rgba(0,0,0,0.06)',
                borderRight:'1px solid rgba(0,0,0,0.06)',
                cursor:'pointer',
                transition:'background 120ms',
                background: isDragOver
                  ? 'rgba(10,102,194,0.08)'
                  : today
                  ? 'rgba(10,102,194,0.04)'
                  : !currentMonth
                  ? 'rgba(0,0,0,0.01)'
                  : '#FFFFFF',
                outline: isDragOver ? '2px solid #0A66C2' : 'none',
              }}
            >
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'4px'}}>
                <span style={{
                  width:'26px',height:'26px',display:'flex',alignItems:'center',justifyContent:'center',
                  borderRadius:'50%',fontSize:'13px',fontWeight:today?700:400,fontFamily:font,
                  background:today?'#0A66C2':'transparent',
                  color:today?'#FFFFFF':!currentMonth?'rgba(0,0,0,0.25)':'rgba(0,0,0,0.75)',
                }}>
                  {date.getDate()}
                </span>
                {currentMonth && (
                  <button
                    onClick={e => { e.stopPropagation(); onDayClick(dateStr) }}
                    style={{width:'20px',height:'20px',borderRadius:'50%',border:'none',background:'rgba(10,102,194,0.1)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}
                  >
                    <Plus style={{width:'12px',height:'12px',color:'#0A66C2'}} />
                  </button>
                )}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                {dayPosts.slice(0, 3).map(post => (
                  <button
                    key={post.id}
                    draggable={!!onPostReschedule}
                    onDragStart={e => { e.stopPropagation(); handleDragStart(e, post.id) }}
                    onDragEnd={handleDragEnd}
                    onClick={e => { e.stopPropagation(); onPostClick(post) }}
                    className={`${statusColors[post.status]}`}
                    style={{width:'100%',textAlign:'left',fontSize:'10px',fontWeight:600,fontFamily:font,padding:'3px 6px',borderRadius:'4px',border:'none',cursor:onPostReschedule?'grab':'pointer',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',transition:'opacity 120ms'}}
                    title={onPostReschedule?'Glisse pour reprogrammer':undefined}
                    onMouseEnter={e=>e.currentTarget.style.opacity='0.8'}
                    onMouseLeave={e=>e.currentTarget.style.opacity='1'}
                  >
                    {post.content.replace(/<[^>]+>/g, '').substring(0, 22)}…
                  </button>
                ))}
                {dayPosts.length > 3 && (
                  <span style={{fontSize:'10px',fontWeight:600,color:'rgba(0,0,0,0.4)',paddingLeft:'2px',fontFamily:font}}>+{dayPosts.length - 3} autres</span>
                )}
                {isDragOver && (
                  <div style={{fontSize:'10px',color:'#0A66C2',fontWeight:700,textAlign:'center',padding:'2px 0'}}>
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
