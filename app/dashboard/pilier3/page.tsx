'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

interface Prospect {
  id: string
  platform: string
  post_title: string | null
  post_url: string
  author: string | null
  subreddit: string | null
  relevance_score: number
  message_generated: string | null
  status: string
  created_at: string
}

interface AutoPost {
  id: string
  platform: string
  content: string
  post_url: string | null
  status: string
  error: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  message_ready: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-800',
  ignored: 'bg-gray-100 text-gray-600',
  pending: 'bg-blue-100 text-blue-800',
  posted: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function Pilier3Page() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [autoPosts, setAutoPosts] = useState<AutoPost[]>([])
  const [activeTab, setActiveTab] = useState<'prospects' | 'posts'>('prospects')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [posting, setPosting] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from('prospects').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('auto_posts').select('*').order('created_at', { ascending: false }).limit(30),
    ])
    setProspects(p || [])
    setAutoPosts(a || [])
    setLoading(false)
  }

  async function triggerAction(endpoint: string, setter: (v: boolean) => void, label: string) {
    setter(true)
    setMessage('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
      })
      const json = await res.json()
      setMessage(`✅ ${label} terminé : ${JSON.stringify(json).substring(0, 120)}`)
      await fetchData()
    } catch (e) {
      setMessage(`❌ Erreur ${label}`)
    } finally {
      setter(false)
    }
  }

  const stats = {
    total: prospects.length,
    new: prospects.filter(p => p.status === 'new').length,
    ready: prospects.filter(p => p.status === 'message_ready').length,
    sent: prospects.filter(p => p.status === 'sent').length,
    postsToday: autoPosts.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).length,
    postsFailed: autoPosts.filter(p => p.status === 'failed').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🎯 Pilier 3 — Prospection Automatique</h1>
        <p className="text-gray-500 mt-1">Scan Reddit & Twitter · Génération de messages · Auto-publication</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Prospects', value: stats.total, color: 'bg-blue-50 text-blue-700' },
          { label: 'Nouveaux', value: stats.new, color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Messages prêts', value: stats.ready, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Envoyés', value: stats.sent, color: 'bg-green-50 text-green-700' },
          { label: 'Posts aujourd'hui', value: stats.postsToday, color: 'bg-purple-50 text-purple-700' },
          { label: 'Posts échoués', value: stats.postsFailed, color: 'bg-red-50 text-red-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions manuelles */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Lancer manuellement</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => triggerAction('/api/pilier3/scan', setScanning, 'Scan')}
            disabled={scanning}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {scanning ? '⏳ Scanning...' : '🔍 Scanner Reddit & Twitter'}
          </button>
          <button
            onClick={() => triggerAction('/api/pilier3/generate-message', setGenerating, 'Génération')}
            disabled={generating}
            className="px-4 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 disabled:opacity-50"
          >
            {generating ? '⏳ Génération...' : '✍️ Générer les messages'}
          </button>
          <button
            onClick={() => triggerAction('/api/pilier3/post', setPosting, 'Publication')}
            disabled={posting}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {posting ? '⏳ Publication...' : '📢 Publier le post du jour'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            🔄 Actualiser
          </button>
        </div>
        {message && (
          <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{message}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['prospects', 'posts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'prospects' ? `🎯 Prospects (${prospects.length})` : `📢 Auto-Posts (${autoPosts.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Chargement...</div>
      ) : activeTab === 'prospects' ? (
        <div className="space-y-3">
          {prospects.length === 0 ? (
            <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-dashed border-gray-300">
              Aucun prospect pour l'instant. Lance un scan pour commencer.
            </div>
          ) : prospects.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {p.platform === 'reddit' ? '🟠' : '🐦'} {p.platform}
                      {p.subreddit && ` · r/${p.subreddit}`}
                    </span>
                    <span className="text-xs text-gray-400">Score: {p.relevance_score.toFixed(1)}</span>
                  </div>
                  <a
                    href={p.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
                  >
                    {p.post_title || p.post_url}
                  </a>
                  {p.author && <p className="text-xs text-gray-400 mt-0.5">par u/{p.author}</p>}
                  {p.message_generated && (
                    <div className="mt-2 text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-2 line-clamp-2">
                      💬 {p.message_generated}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(p.created_at).toLocaleString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {autoPosts.length === 0 ? (
            <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-dashed border-gray-300">
              Aucun auto-post pour l'instant.
            </div>
          ) : autoPosts.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {p.platform === 'reddit' ? '🟠' : '🐦'} {p.platform}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">{p.content}</p>
                  {p.post_url && (
                    <a href={p.post_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">
                      Voir le post →
                    </a>
                  )}
                  {p.error && (
                    <p className="text-xs text-red-500 mt-1">❌ {p.error}</p>
                  )}
                </div>
                <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(p.created_at).toLocaleString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
