'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { TrendingUp, Target, Clock, FileText, Zap, AlertCircle } from 'lucide-react'

interface Post {
  id: string
  content: string
  scheduled_at: string
  status: 'scheduled' | 'published' | 'failed' | 'draft'
  images?: string[]
}

interface AnalyticsProps {
  posts: Post[]
  isPremium: boolean
  onUpgrade: () => void
}

const COLORS = {
  published: '#34D399',
  scheduled: '#A78BFA',
  failed: '#EF4444',
  draft: '#6B7280',
}

const VIOLET = '#A78BFA'
const DARK_CARD = 'rgba(255,255,255,0.025)'
const BORDER = 'rgba(255,255,255,0.06)'

function KpiCard({ icon: Icon, label, value, sub, color, delay }: {
  icon: any, label: string, value: string | number, sub?: string, color: string, delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      style={{
        background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px',
        padding: '20px', position: 'relative', overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', fontWeight: 500 }}>{label}</p>
          <p style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'Syne,sans-serif', letterSpacing: '-0.03em', background: `linear-gradient(135deg,#fff 0%,${color} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {value}
          </p>
          {sub && <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{sub}</p>}
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `rgba(${color === '#34D399' ? '52,211,153' : color === '#A78BFA' ? '167,139,250' : color === '#60A5FA' ? '96,165,250' : '245,158,11'},0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}40` }}>
          <Icon style={{ width: '18px', height: '18px', color }} />
        </div>
      </div>
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1A1A22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px' }}>
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ fontSize: '13px', fontWeight: 600, color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    )
  }
  return null
}

export default function Analytics({ posts, isPremium, onUpgrade }: AnalyticsProps) {

  const stats = useMemo(() => {
    const published = posts.filter(p => p.status === 'published')
    const failed = posts.filter(p => p.status === 'failed')
    const scheduled = posts.filter(p => p.status === 'scheduled')

    // Taux de réussite
    const total = published.length + failed.length
    const successRate = total > 0 ? Math.round((published.length / total) * 100) : 0

    // Longueur moyenne des posts
    const avgLength = posts.length > 0
      ? Math.round(posts.reduce((acc, p) => acc + p.content.replace(/<[^>]+>/g, '').length, 0) / posts.length)
      : 0

    // Posts des 8 dernières semaines
    const weeklyData: Record<string, { published: number; scheduled: number }> = {}
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const weekLabel = `S${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      weeklyData[weekLabel] = { published: 0, scheduled: 0 }
    }
    posts.forEach(p => {
      const d = new Date(p.scheduled_at)
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays < 56) {
        const weekIdx = 7 - Math.floor(diffDays / 7)
        const keys = Object.keys(weeklyData)
        const key = keys[weekIdx] || keys[keys.length - 1]
        if (key && weeklyData[key]) {
          if (p.status === 'published') weeklyData[key].published++
          else if (p.status === 'scheduled') weeklyData[key].scheduled++
        }
      }
    })
    const weeklyChart = Object.entries(weeklyData).map(([week, v]) => ({ week, ...v }))

    // Répartition par statut
    const statusData = [
      { name: 'Publiés', value: published.length, color: COLORS.published },
      { name: 'Programmés', value: scheduled.length, color: COLORS.scheduled },
      { name: 'Échoués', value: failed.length, color: COLORS.failed },
      { name: 'Brouillons', value: posts.filter(p => p.status === 'draft').length, color: COLORS.draft },
    ].filter(d => d.value > 0)

    // Meilleurs jours de publication
    const dayCount: Record<string, number> = { Lun: 0, Mar: 0, Mer: 0, Jeu: 0, Ven: 0, Sam: 0, Dim: 0 }
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    published.forEach(p => {
      const d = new Date(p.scheduled_at)
      const day = days[d.getDay()]
      dayCount[day]++
    })
    const dayChart = Object.entries(dayCount).map(([day, count]) => ({ day, count }))

    // Heures de publication
    const hourCount: Record<number, number> = {}
    for (let h = 0; h < 24; h++) hourCount[h] = 0
    published.forEach(p => {
      const h = new Date(p.scheduled_at).getHours()
      hourCount[h]++
    })
    const hourChart = Object.entries(hourCount)
      .filter(([h]) => Number(h) >= 6 && Number(h) <= 22)
      .map(([h, count]) => ({ hour: `${h}h`, count }))

    // Ce mois vs mois dernier
    const thisMonth = published.filter(p => {
      const d = new Date(p.scheduled_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const lastMonth = published.filter(p => {
      const d = new Date(p.scheduled_at)
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
    }).length

    return { published, failed, scheduled, successRate, avgLength, weeklyChart, statusData, dayChart, hourChart, thisMonth, lastMonth }
  }, [posts])

  // Bloc paywall pour plan gratuit
  if (!isPremium) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          borderRadius: '16px', padding: '60px 32px', textAlign: 'center',
          background: DARK_CARD, border: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden'
        }}
      >
        {/* Aperçu flouté en arrière-plan */}
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(8px)', opacity: 0.3, pointerEvents: 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '24px' }}>
            {[40, 60, 35, 80].map((h, i) => (
              <div key={i} style={{ height: `${h}px`, borderRadius: '8px', background: VIOLET }} />
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertCircle style={{ width: '24px', height: '24px', color: VIOLET }} />
          </div>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '20px', color: '#E5E7EB', marginBottom: '12px' }}>
            Analytics avancées — Plan Premium
          </h3>
          <p style={{ fontSize: '14px', color: '#9CA3AF', maxWidth: '400px', margin: '0 auto 28px', lineHeight: 1.6 }}>
            Accède à tes stats de publication, meilleurs jours, heures optimales et taux de réussite pour maximiser ton engagement LinkedIn.
          </p>
          <button
            onClick={onUpgrade}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
              color: 'white', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)', transition: 'all 0.3s'
            }}
          >
            <Zap style={{ width: '16px', height: '16px' }} />
            Passer en Premium — 19€/mois
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard icon={FileText} label="Posts publiés" value={stats.published.length} sub={`${stats.thisMonth} ce mois`} color="#34D399" delay={0.1} />
        <KpiCard icon={Target} label="Taux de réussite" value={`${stats.successRate}%`} sub={`${stats.failed.length} échec${stats.failed.length > 1 ? 's' : ''}`} color="#A78BFA" delay={0.15} />
        <KpiCard icon={TrendingUp} label="Ce mois vs dernier" value={stats.thisMonth} sub={stats.lastMonth > 0 ? `${stats.lastMonth > stats.thisMonth ? '▼' : '▲'} ${Math.abs(stats.thisMonth - stats.lastMonth)} vs ${stats.lastMonth}` : 'Premier mois'} color="#60A5FA" delay={0.2} />
        <KpiCard icon={Clock} label="Longueur moyenne" value={stats.avgLength} sub="caractères par post" color="#F59E0B" delay={0.25} />
      </div>

      {/* Graphique hebdomadaire + Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>

        {/* Publications par semaine */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
          style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px' }}
        >
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '14px', color: '#E5E7EB', marginBottom: '20px' }}>
            Publications — 8 dernières semaines
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weeklyChart} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="published" name="Publiés" fill="#34D399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="scheduled" name="Programmés" fill="#A78BFA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Répartition statuts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}
          style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px' }}
        >
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '14px', color: '#E5E7EB', marginBottom: '20px' }}>
            Répartition des posts
          </h3>
          {stats.statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {stats.statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {stats.statusData.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                      <span style={{ color: '#9CA3AF' }}>{s.name}</span>
                    </div>
                    <span style={{ color: '#E5E7EB', fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: '13px', color: '#6B7280' }}>Pas encore de données</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Meilleurs jours + Heures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Meilleurs jours */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
          style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px' }}
        >
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '14px', color: '#E5E7EB', marginBottom: '20px' }}>
            📅 Meilleurs jours de publication
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.dayChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Posts" fill="#A78BFA" radius={[4, 4, 0, 0]}>
                {stats.dayChart.map((entry, i) => (
                  <Cell key={i} fill={entry.count === Math.max(...stats.dayChart.map(d => d.count)) ? '#7C3AED' : '#A78BFA'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Heures optimales */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}
          style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px' }}
        >
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '14px', color: '#E5E7EB', marginBottom: '20px' }}>
            ⏰ Heures de publication
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={stats.hourChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" name="Posts" stroke="#60A5FA" strokeWidth={2} dot={{ fill: '#60A5FA', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Conseil LinkedIn */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
        style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}
      >
        <Zap style={{ width: '16px', height: '16px', color: VIOLET, flexShrink: 0 }} />
        <p style={{ fontSize: '13px', color: '#C4B5FD', lineHeight: 1.5 }}>
          <strong>Conseil :</strong> Les posts publiés <strong>Mardi, Mercredi et Jeudi entre 8h et 10h</strong> génèrent en moyenne 3× plus d'engagement sur LinkedIn. Planifie tes meilleurs contenus sur ces créneaux.
        </p>
      </motion.div>
    </div>
  )
}
