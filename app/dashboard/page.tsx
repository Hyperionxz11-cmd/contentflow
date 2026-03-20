'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Zap, LogOut, Plus, Calendar as CalendarIcon,
  LayoutGrid, BarChart3, Linkedin, Upload,
  Pencil, Trash2, Eye, X, Check, Loader2
} from 'lucide-react'
import CalendarView from '@/components/calendar/CalendarView'
import PostEditor from '@/components/post/PostEditor'
import BulkImport from '@/components/dashboard/BulkImport'
import LinkedInPreview from '@/components/linkedin/LinkedInPreview'
import { defaultTemplates } from '@/lib/templates'

interface Post {
  id: string
  content: string
  scheduled_at: string
  status: 'scheduled' | 'published' | 'failed' | 'draft'
  images?: string[]
}

interface Profile {
  id: string
  email: string
  plan: string
  linkedin_connected: boolean
  linkedin_name?: string
  linkedin_user_id?: string
  linkedin_picture_url?: string
  linkedin_token_expires_at?: string
  full_name?: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [activeTab, setActiveTab] = useState<'calendar' | 'posts' | 'analytics'>('calendar')
  const [previewPost, setPreviewPost] = useState<Post | null>(null)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const POSTS_PER_PAGE = 20
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUser(user)

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile({
            id: profileData.id,
            email: profileData.email,
            plan: profileData.plan,
            linkedin_connected: profileData.linkedin_connected || !!profileData.linkedin_access_token,
            linkedin_name: profileData.linkedin_name,
            linkedin_user_id: profileData.linkedin_user_id,
            linkedin_picture_url: profileData.linkedin_picture_url,
            linkedin_token_expires_at: profileData.linkedin_token_expires_at,
            full_name: profileData.full_name,
          } as Profile)
        }

        // Fetch posts
        const { data: userPosts } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('scheduled_at', { ascending: true })

        if (userPosts) {
          setPosts(userPosts as Post[])
        }
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
    setShowEditor(true)
  }

  const handleSavePost = async (post: { content: string; scheduledAt: string; status: string }) => {
    const newPost: Post = {
      id: Date.now().toString(),
      content: post.content,
      scheduled_at: post.scheduledAt,
      status: post.status === 'publish_now' ? 'published' : 'scheduled',
    }

    // Save to Supabase if connected
    if (user) {
      const supabase = createClient()
      const { data } = await supabase.from('posts').insert({
        user_id: user.id,
        content: post.content,
        scheduled_at: post.scheduledAt,
        status: newPost.status,
      }).select().single()

      if (data) newPost.id = data.id
    }

    setPosts(prev => [...prev, newPost])
    setShowEditor(false)
  }

  /** Upload une image base64 vers Supabase Storage, retourne l'URL publique */
  const uploadImageToStorage = async (
    supabase: ReturnType<typeof createClient>,
    userId: string,
    base64: string,
    filename: string
  ): Promise<string | null> => {
    try {
      const match = base64.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) return null
      const mimeType = match[1]
      const b64data = match[2]
      const byteChars = atob(b64data)
      const bytes = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType })
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
      const path = `${userId}/${Date.now()}-${filename}.${ext}`
      const { error } = await supabase.storage.from('post-images').upload(path, blob, {
        contentType: mimeType,
        upsert: false,
      })
      if (error) { console.error('Storage upload error:', error); return null }
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
      return urlData?.publicUrl || null
    } catch (err) {
      console.error('uploadImageToStorage error:', err)
      return null
    }
  }

  const handleBulkImport = async (importedPosts: { content: string; scheduledAt: string; status: string; images?: string[] }[]) => {
    if (user) {
      const supabase = createClient()

      // Upload chaque image base64 vers Storage, remplace par URL publique
      const postsWithUrls = await Promise.all(
        importedPosts.map(async (p, postIdx) => {
          if (!p.images || p.images.length === 0) return { ...p, images: [] }
          const urls = await Promise.all(
            p.images.map((img, imgIdx) =>
              img.startsWith('data:')
                ? uploadImageToStorage(supabase, user.id, img, `post${postIdx}-img${imgIdx}`)
                : Promise.resolve(img)
            )
          )
          return { ...p, images: urls.filter(Boolean) as string[] }
        })
      )

      const toInsert = postsWithUrls.map(p => ({
        user_id: user.id,
        content: p.content,
        scheduled_at: p.scheduledAt,
        status: p.status,
        images: p.images && p.images.length > 0 ? p.images : [],
      }))

      const { data } = await supabase.from('posts').insert(toInsert).select()
      if (data) {
        setPosts(prev => [...prev, ...data.map((d: any) => ({
          id: d.id,
          content: d.content,
          scheduled_at: d.scheduled_at,
          status: d.status,
          images: d.images || [],
        }))])
      }
    }
    setShowBulkImport(false)
  }

  const openEditModal = (post: Post) => {
    setEditingPost(post)
    setEditContent(post.content)
    const d = new Date(post.scheduled_at)
    setEditDate(d.toISOString().split('T')[0])
    setEditTime(d.toTimeString().slice(0, 5))
  }

  const handleSaveEdit = async () => {
    if (!editingPost || !user) return
    setSavingEdit(true)
    const supabase = createClient()
    const newScheduledAt = new Date(`${editDate}T${editTime}:00`).toISOString()
    const { error } = await supabase.from('posts').update({
      content: editContent,
      scheduled_at: newScheduledAt,
    }).eq('id', editingPost.id)
    if (!error) {
      setPosts(prev => prev.map(p =>
        p.id === editingPost.id
          ? { ...p, content: editContent, scheduled_at: newScheduledAt }
          : p
      ))
      setEditingPost(null)
    }
    setSavingEdit(false)
  }

  const handleDeletePost = async (id: string) => {
    if (!user) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  // Auto-refresh : met à jour le statut des posts toutes les 30s
  const refreshPostStatuses = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('posts')
      .select('id, status')
      .eq('user_id', user.id)
    if (data) {
      setPosts(prev => prev.map(p => {
        const updated = data.find((d: any) => d.id === p.id)
        return updated ? { ...p, status: updated.status } : p
      }))
    }
  }, [user])

  useEffect(() => {
    const interval = setInterval(refreshPostStatuses, 30_000)
    return () => clearInterval(interval)
  }, [refreshPostStatuses])

  // Réessayer un post échoué : reprogramme dans 5 minutes
  const handleRetryPost = async (post: Post) => {
    if (!user) return
    setRetryingId(post.id)
    const supabase = createClient()
    const retryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const { error } = await supabase.from('posts').update({
      status: 'scheduled',
      scheduled_at: retryAt,
    }).eq('id', post.id)
    if (!error) {
      setPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, status: 'scheduled', scheduled_at: retryAt } : p
      ))
    }
    setRetryingId(null)
  }

  const handleConnectLinkedIn = () => {
    window.location.href = '/api/linkedin/auth'
  }

  const handleDisconnectLinkedIn = async () => {
    if (!user) return
    const supabase = createClient()
    await supabase.from('profiles').update({
      linkedin_access_token: null,
      linkedin_user_id: null,
      linkedin_name: null,
      linkedin_picture_url: null,
      linkedin_connected: false,
    }).eq('id', user.id)
    setProfile(prev => prev ? {
      ...prev,
      linkedin_connected: false,
      linkedin_name: undefined,
      linkedin_user_id: undefined,
      linkedin_picture_url: undefined,
    } : prev)
  }

  const scheduledCount = posts.filter(p => p.status === 'scheduled').length
  const publishedCount = posts.filter(p => p.status === 'published').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090B' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: 'var(--accent-bright)', borderRightColor: 'rgba(124,58,237,0.3)' }} />
          <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Chargement…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090B' }}>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 z-40 hidden lg:flex flex-col" style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
        {/* Logo */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)', boxShadow: '0 0 16px rgba(124,58,237,0.4)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '17px', color: 'var(--text)', letterSpacing: '-0.01em' }}>ContentFlow</span>
          </div>

          {/* Nav */}
          <nav className="space-y-0.5">
            {[
              { id: 'calendar' as const, icon: CalendarIcon, label: 'Calendrier' },
              { id: 'posts' as const, icon: LayoutGrid, label: 'Mes posts' },
              { id: 'analytics' as const, icon: BarChart3, label: 'Analytics' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left relative group"
                style={{
                  background: activeTab === item.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                  color: activeTab === item.id ? 'var(--accent-text)' : 'var(--text-muted)',
                  borderLeft: activeTab === item.id ? '2px solid var(--accent-bright)' : '2px solid transparent',
                  paddingLeft: '10px',
                }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="px-6 flex-1 overflow-y-auto">
          {/* LinkedIn section */}
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {profile?.linkedin_connected ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>LinkedIn connecté</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs truncate max-w-[110px]" style={{ color: 'var(--text-muted)' }}>
                    {profile.linkedin_name || profile.full_name || 'Compte vérifié'}
                  </p>
                  <button onClick={handleDisconnectLinkedIn} className="text-xs font-medium transition-colors" style={{ color: 'var(--danger)' }}>
                    Déco
                  </button>
                </div>
                {profile.linkedin_token_expires_at && (() => {
                  const daysLeft = Math.ceil((new Date(profile.linkedin_token_expires_at).getTime() - Date.now()) / 86400000)
                  if (daysLeft <= 0) return (
                    <div className="mt-2 p-2 rounded-lg" style={{ background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="text-xs font-medium" style={{ color: '#FCA5A5' }}>Token expiré</p>
                      <button onClick={handleConnectLinkedIn} className="mt-1 text-xs underline" style={{ color: '#FCA5A5' }}>Reconnecter →</button>
                    </div>
                  )
                  if (daysLeft <= 7) return (
                    <div className="mt-2 p-2 rounded-lg" style={{ background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <p className="text-xs font-medium" style={{ color: '#FCD34D' }}>Expire dans {daysLeft}j</p>
                      <button onClick={handleConnectLinkedIn} className="mt-1 text-xs underline" style={{ color: '#FCD34D' }}>Renouveler →</button>
                    </div>
                  )
                  return null
                })()}
              </div>
            ) : (
              <div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Connecte LinkedIn pour publier automatiquement</p>
                <button
                  onClick={handleConnectLinkedIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 0 14px rgba(124,58,237,0.25)' }}
                >
                  <Linkedin className="w-4 h-4" />
                  Connecter LinkedIn
                </button>
              </div>
            )}
          </div>

          {/* Plan */}
          <div className="mt-3 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Plan actuel</span>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-text)' }}>{profile?.plan || 'Free'}</span>
            </div>
            {(!profile || profile.plan === 'free') && (
              <button
                onClick={() => router.push('/pricing')}
                className="w-full mt-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ border: '1px solid var(--accent)', color: 'var(--accent-text)', background: 'transparent' }}
              >
                Passer en Premium ↗
              </button>
            )}
          </div>
        </div>

        {/* User footer */}
        <div className="p-4 mt-auto" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #A78BFA 100%)' }}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-xs truncate" style={{ color: 'var(--text-soft)' }}>{user?.email}</span>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 p-6 lg:p-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="leading-tight" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {activeTab === 'calendar' ? 'Calendrier' : activeTab === 'posts' ? 'Mes posts' : 'Analytics'}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {scheduledCount} programmé{scheduledCount > 1 ? 's' : ''} · {publishedCount} publié{publishedCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ border: '1px solid var(--border-strong)', color: 'var(--text-soft)', background: 'transparent' }}
            >
              <Upload className="w-4 h-4" />
              Importer
            </button>
            <button
              onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setShowEditor(true) }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 0 16px rgba(124,58,237,0.25)' }}
            >
              <Plus className="w-4 h-4" />
              Nouveau post
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Programmés', value: scheduledCount, color: 'var(--accent-text)', accent: 'rgba(124,58,237,0.08)' },
            { label: 'Publiés', value: publishedCount, color: 'var(--success)', accent: 'rgba(16,185,129,0.08)' },
            { label: 'Brouillons', value: posts.filter(p => p.status === 'draft').length, color: 'var(--text-soft)', accent: 'transparent' },
            { label: 'Échoués', value: posts.filter(p => p.status === 'failed').length, color: 'var(--danger)', accent: 'rgba(239,68,68,0.08)' },
          ].map(stat => (
            <div key={stat.label} className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              <p className="leading-none" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '32px', color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Calendar / Posts / Analytics */}
        {activeTab === 'calendar' && (
          <CalendarView
            posts={posts}
            onDayClick={handleDayClick}
            onPostClick={(post) => setPreviewPost(post as Post)}
          />
        )}

        {activeTab === 'posts' && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>Tous les posts</h3>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{posts.length} post{posts.length > 1 ? 's' : ''} au total</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {posts.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-lg mb-2 font-medium" style={{ color: 'var(--text)' }}>Aucun post pour l'instant</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Clique sur "Nouveau post" ou "Importer" pour commencer !</p>
                </div>
              ) : (
                (() => {
                  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)
                  const paginated = posts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE)
                  return (<>
                  {paginated.map(post => {
                  const d = new Date(post.scheduled_at)
                  const isConfirmingDelete = confirmDeleteId === post.id
                  const isDeleting = deletingId === post.id
                  const isRetrying = retryingId === post.id
                  return (
                    <div key={post.id} className="px-6 py-4 flex items-start gap-4 transition-colors group" style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
                      {/* Date column */}
                      <div className="flex-shrink-0 w-14 text-center">
                        <p className="text-xl font-bold leading-none" style={{ color: 'var(--accent-text)', fontFamily: 'Syne, sans-serif' }}>{d.getDate()}</p>
                        <p className="text-xs uppercase mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {d.toLocaleDateString('fr-FR', { month: 'short' })}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2" style={{ color: 'var(--text-soft)' }}>
                          {post.content.replace(/<[^>]+>/g, '').slice(0, 200)}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{post.content.replace(/<[^>]+>/g, '').length} car.</span>
                          {post.images && post.images.length > 0 && (
                            <span className="text-xs" style={{ color: 'var(--accent-text)' }}>🖼 {post.images.length} image{post.images.length > 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {/* Status badge */}
                        <span className="text-xs font-semibold px-3 py-1 rounded-lg" style={{
                          background: post.status === 'scheduled' ? 'rgba(124,58,237,0.1)' : post.status === 'published' ? 'rgba(16,185,129,0.1)' : post.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                          color: post.status === 'scheduled' ? 'var(--accent-text)' : post.status === 'published' ? 'var(--success)' : post.status === 'failed' ? 'var(--danger)' : 'var(--text-muted)'
                        }}>
                          {post.status === 'scheduled' ? '⏰ Programmé' :
                           post.status === 'published' ? '✓ Publié' :
                           post.status === 'failed' ? '✗ Échoué' : 'Brouillon'}
                        </span>

                        {/* Action buttons */}
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>Supprimer ?</span>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              disabled={isDeleting}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                              style={{ background: 'var(--danger)', color: 'white' }}
                            >
                              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Oui
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 text-xs rounded-lg transition-colors"
                              style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setPreviewPost(post)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors"
                              style={{ color: 'var(--accent-text)', background: 'rgba(124,58,237,0.08)' }}
                              title="Aperçu LinkedIn"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Aperçu
                            </button>
                            {post.status !== 'published' && (
                              <button
                                onClick={() => openEditModal(post)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors"
                                style={{ color: 'var(--accent-text)', background: 'rgba(124,58,237,0.08)' }}
                                title="Modifier"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Modifier
                              </button>
                            )}
                            {post.status === 'failed' && (
                              <button
                                onClick={() => handleRetryPost(post)}
                                disabled={isRetrying}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors font-medium"
                                style={{ color: 'var(--amber)', background: 'rgba(245,158,11,0.08)' }}
                                title="Réessayer dans 5 min"
                              >
                                {isRetrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '↺'}
                                Réessayer
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteId(post.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors"
                              style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                  })}
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Page {currentPage} / {totalPages} · {posts.length} posts
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                          style={{ color: 'var(--text-soft)', border: '1px solid var(--border)', background: 'transparent' }}
                        >
                          ← Précédent
                        </button>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                          style={{ color: 'var(--text-soft)', border: '1px solid var(--border)', background: 'transparent' }}
                        >
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}
                  </>)
                })()
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <BarChart3 className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>Analytics bientôt disponibles</h3>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              Les analytics seront disponibles une fois que tu auras connecté ton LinkedIn et publié quelques posts.
            </p>
          </div>
        )}

        {/* LinkedIn Preview Modal */}
        {previewPost && (
          <LinkedInPreview
            content={previewPost.content}
            scheduledAt={previewPost.scheduled_at}
            status={previewPost.status}
            authorName={profile?.linkedin_name || profile?.full_name || 'André Isoz'}
            authorHeadline="Conseiller financier | Brevet Fédéral"
            authorAvatar={profile?.linkedin_picture_url}
            images={previewPost.images || []}
            onClose={() => setPreviewPost(null)}
          />
        )}

        {/* Bulk Import Modal */}
        {showBulkImport && (
          <BulkImport
            onImport={handleBulkImport}
            onClose={() => setShowBulkImport(false)}
          />
        )}

        {/* Edit Post Modal */}
        {editingPost && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-xl" style={{ background: 'var(--bg-surface)', boxShadow: '0 20px 64px rgba(0,0,0,0.6)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>Modifier le post</h2>
                <button onClick={() => setEditingPost(null)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-soft)' }}>Contenu</label>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none font-mono outline-none transition-all"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent-bright)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{editContent.length} caractères</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-soft)' }}>Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent-bright)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-soft)' }}>Heure</label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={e => setEditTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent-bright)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setEditingPost(null)}
                  className="px-5 py-2.5 text-sm rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: savingEdit ? 'var(--accent-dim)' : 'var(--accent)', color: 'white', boxShadow: savingEdit ? 'none' : '0 0 14px rgba(124,58,237,0.25)' }}
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Post Editor Modal */}
        {showEditor && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <PostEditor
                onSave={handleSavePost}
                onClose={() => setShowEditor(false)}
                initialDate={selectedDate}
                templates={defaultTemplates}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
