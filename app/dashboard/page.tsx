'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Zap, LogOut, Plus, Calendar as CalendarIcon,
  LayoutGrid, BarChart3, Settings, Linkedin, Upload
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

  const handleBulkImport = async (importedPosts: { content: string; scheduledAt: string; status: string; images?: string[] }[]) => {
    if (user) {
      const supabase = createClient()
      const toInsert = importedPosts.map(p => ({
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

  const handleConnectLinkedIn = () => {
    window.location.href = '/api/linkedin/auth'
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
                <p className="text-xs text-gray-500 ml-7">
                  {profile.linkedin_name || profile.full_name || 'Compte vérifié'}
                </p>
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
              <span className="text-xs text-gray-400">Clique sur un post pour voir l'aperçu LinkedIn</span>
            </div>
            <div className="divide-y divide-gray-50">
              {posts.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <p className="text-lg mb-2">Aucun post pour l'instant</p>
                  <p className="text-sm">Clique sur "Nouveau post" ou "Importer" pour commencer !</p>
                </div>
              ) : (
                posts.map(post => {
                  const d = new Date(post.scheduled_at)
                  const isPast = d < new Date()
                  return (
                    <div
                      key={post.id}
                      onClick={() => setPreviewPost(post)}
                      className="px-6 py-4 flex items-start gap-4 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    >
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
                        <p className="text-sm text-gray-800 line-clamp-2 group-hover:text-gray-900 transition-colors">
                          {post.content.replace(/<[^>]+>/g, '').slice(0, 200)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {post.content.replace(/<[^>]+>/g, '').length} caractères
                        </p>
                      </div>

                      {/* Status + preview hint */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
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
                        <span className="text-xs text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          Voir aperçu →
                        </span>
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
