'use client'

import { useState, useEffect } from 'react'
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
  const [deletingId, setDeletingId] = useState<string | null>(null)    // id du post en cours de suppression
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)  // id affiché avec confirmation
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40 hidden lg:block">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">ContentFlow</span>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'calendar' as const, icon: CalendarIcon, label: 'Calendrier' },
              { id: 'posts' as const, icon: LayoutGrid, label: 'Mes posts' },
              { id: 'analytics' as const, icon: BarChart3, label: 'Analytics' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* LinkedIn connect */}
          <div className="mt-8 p-4 bg-blue-50 rounded-xl">
            {profile?.linkedin_connected ? (
              <div>
                <div className="flex items-center gap-2 text-sm text-[var(--primary)] mb-1">
                  <Linkedin className="w-5 h-5" />
                  <span className="font-medium">LinkedIn connecté</span>
                </div>
                <div className="flex items-center justify-between ml-7 mt-0.5">
                  <p className="text-xs text-gray-500 truncate max-w-[110px]">
                    {profile.linkedin_name || profile.full_name || 'Compte vérifié'}
                  </p>
                  <button
                    onClick={handleDisconnectLinkedIn}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium flex-shrink-0"
                    title="Déconnecter LinkedIn"
                  >
                    ✕ Déco
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-3">Connecte ton LinkedIn pour publier automatiquement</p>
                <button
                  onClick={handleConnectLinkedIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  Connecter LinkedIn
                </button>
              </>
            )}
          </div>

          {/* Plan */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Plan actuel</span>
              <span className="text-xs font-bold text-[var(--primary)] uppercase">{profile?.plan || 'Free'}</span>
            </div>
            {(!profile || profile.plan === 'free') && (
              <button
                onClick={() => router.push('/pricing')}
                className="w-full mt-2 py-2 text-xs font-semibold text-[var(--primary)] border border-[var(--primary)] rounded-lg hover:bg-[var(--primary-light)] transition-colors"
              >
                Passer en Premium
              </button>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-blue-400 flex items-center justify-center text-white text-xs font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-gray-600 truncate max-w-[120px]">{user?.email}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
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
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'calendar' ? 'Calendrier' : activeTab === 'posts' ? 'Mes posts' : 'Analytics'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {scheduledCount} post{scheduledCount > 1 ? 's' : ''} programmé{scheduledCount > 1 ? 's' : ''} · {publishedCount} publié{publishedCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-2 px-4 py-3 border border-[var(--primary)] text-[var(--primary)] text-sm font-semibold rounded-xl hover:bg-[var(--primary-light)] transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importer
            </button>
            <button
              onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setShowEditor(true) }}
              className="flex items-center gap-2 px-5 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Nouveau post
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Programmés', value: scheduledCount, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary-light)]' },
            { label: 'Publiés', value: publishedCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Brouillons', value: posts.filter(p => p.status === 'draft').length, color: 'text-gray-600', bg: 'bg-gray-100' },
            { label: 'Échoués', value: posts.filter(p => p.status === 'failed').length, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-400 mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Calendar / Posts / Analytics */}
        {activeTab === 'calendar' && (
          <CalendarView
            posts={posts}
            onDayClick={handleDayClick}
            onPostClick={(post) => console.log('View post', post)}
          />
        )}

        {activeTab === 'posts' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Tous les posts</h3>
              <span className="text-xs text-gray-400">{posts.length} post{posts.length > 1 ? 's' : ''} au total</span>
            </div>
            <div className="divide-y divide-gray-100">
              {posts.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <p className="text-lg mb-2">Aucun post pour l'instant</p>
                  <p className="text-sm">Clique sur "Nouveau post" ou "Importer" pour commencer !</p>
                </div>
              ) : (
                posts.map(post => {
                  const d = new Date(post.scheduled_at)
                  const isConfirmingDelete = confirmDeleteId === post.id
                  const isDeleting = deletingId === post.id
                  return (
                    <div key={post.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/60 transition-colors group">
                      {/* Date column */}
                      <div className="flex-shrink-0 w-14 text-center">
                        <p className="text-xl font-bold text-[var(--primary)] leading-none">{d.getDate()}</p>
                        <p className="text-xs text-gray-400 uppercase mt-0.5">
                          {d.toLocaleDateString('fr-FR', { month: 'short' })}
                        </p>
                        <p className="text-xs text-gray-400">{d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {post.content.replace(/<[^>]+>/g, '').slice(0, 200)}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-gray-400">{post.content.replace(/<[^>]+>/g, '').length} car.</span>
                          {post.images && post.images.length > 0 && (
                            <span className="text-xs text-blue-500">🖼 {post.images.length} image{post.images.length > 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {/* Status badge */}
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          post.status === 'scheduled' ? 'bg-[var(--primary-light)] text-[var(--primary)]' :
                          post.status === 'published' ? 'bg-emerald-50 text-emerald-600' :
                          post.status === 'failed' ? 'bg-red-50 text-red-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {post.status === 'scheduled' ? '⏰ Programmé' :
                           post.status === 'published' ? '✓ Publié' :
                           post.status === 'failed' ? '✗ Échoué' : 'Brouillon'}
                        </span>

                        {/* Action buttons */}
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500 mr-1">Supprimer ?</span>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              disabled={isDeleting}
                              className="flex items-center gap-1 px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Oui
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setPreviewPost(post)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-[#0a66c2] hover:bg-blue-50 rounded-lg transition-colors"
                              title="Aperçu LinkedIn"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Aperçu
                            </button>
                            <button
                              onClick={() => openEditModal(post)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Modifier
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(post.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Analytics bientôt disponibles</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Modifier le post</h2>
                <button onClick={() => setEditingPost(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contenu</label>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{editContent.length} caractères</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={e => setEditTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingPost(null)}
                  className="px-5 py-2.5 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50"
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
