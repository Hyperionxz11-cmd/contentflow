'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, LogOut, Plus, Calendar as CalendarIcon,
  LayoutGrid, BarChart3, Linkedin, Upload,
  Pencil, Trash2, Eye, X, Check, Loader2,
  FileText, Clock, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, TrendingUp
} from 'lucide-react'
import CalendarView from '@/components/calendar/CalendarView'
import PostEditor from '@/components/post/PostEditor'
import BulkImport from '@/components/dashboard/BulkImport'
import LinkedInPreview from '@/components/linkedin/LinkedInPreview'
import { defaultTemplates } from '@/lib/templates'

const LINKEDIN_COLORS = {
  background: '#F3F2EF',
  white: '#FFFFFF',
  borderColor: 'rgba(0,0,0,0.08)',
  primaryBlue: '#0A66C2',
  hoverBlue: '#004182',
  textPrimary: 'rgba(0,0,0,0.9)',
  textSecondary: 'rgba(0,0,0,0.6)',
  lightBlueBg: '#EAF0F8',
  green: '#057642',
  greenBg: '#E9F5EE',
  red: '#CC1016',
  redBg: '#FCEAEA',
}

const LINKEDIN_FONT = "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

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
  const totalCount = posts.length
  const draftCount = posts.filter(p => p.status === 'draft').length

  if (loading) {
    return (
      <div style={{minHeight:'100vh',background:LINKEDIN_COLORS.background,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:LINKEDIN_FONT}}>
        <div style={{textAlign:'center'}}>
          <div style={{
            width:'40px',height:'40px',borderRadius:'50%',
            border:'3px solid rgba(10,102,194,0.2)',
            borderTopColor:LINKEDIN_COLORS.primaryBlue,
            animation:'spin 0.8s linear infinite',
            margin:'0 auto 16px'
          }} />
          <p style={{color:LINKEDIN_COLORS.textSecondary,fontSize:'14px'}}>Chargement…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:LINKEDIN_COLORS.background,fontFamily:LINKEDIN_FONT}}>
      <nav style={{
        position:'fixed',top:0,left:0,right:0,height:'52px',
        background:LINKEDIN_COLORS.white,
        borderBottom:`1px solid ${LINKEDIN_COLORS.borderColor}`,
        zIndex:100,display:'flex',alignItems:'center',
        padding:'0 20px',gap:'8px'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:'6px',marginRight:'8px'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'6px',background:LINKEDIN_COLORS.primaryBlue,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Zap style={{width:'18px',height:'18px',color:LINKEDIN_COLORS.white}} />
          </div>
          <span style={{fontWeight:700,fontSize:'18px',color:LINKEDIN_COLORS.primaryBlue,letterSpacing:'-0.01em'}}>
            ContentFlow
          </span>
        </div>

        <div style={{flex:1}} />

        {[
          {id:'calendar' as const,icon:CalendarIcon,label:'Calendrier'},
          {id:'posts' as const,icon:LayoutGrid,label:'Posts'},
          {id:'analytics' as const,icon:BarChart3,label:'Analytics'},
        ].map(item=>(
          <button key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display:'flex',flexDirection:'column',alignItems:'center',
              padding:'6px 16px',borderRadius:'4px',cursor:'pointer',
              color:activeTab===item.id?LINKEDIN_COLORS.textPrimary:LINKEDIN_COLORS.textSecondary,
              border:'none',background:'none',fontFamily:LINKEDIN_FONT,
              fontSize:'11px',fontWeight:600,gap:'2px',
              borderBottom:activeTab===item.id?`2px solid ${LINKEDIN_COLORS.textPrimary}`:'2px solid transparent'
            }}
          >
            <item.icon style={{width:'20px',height:'20px'}} />
            {item.label}
          </button>
        ))}

        <div style={{flex:1}} />

        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <div style={{
            width:'34px',height:'34px',borderRadius:'50%',
            background:LINKEDIN_COLORS.primaryBlue,display:'flex',alignItems:'center',justifyContent:'center',
            color:LINKEDIN_COLORS.white,fontWeight:700,fontSize:'13px'
          }}>
            {(profile?.full_name||profile?.email||'U')[0].toUpperCase()}
          </div>
          <button onClick={handleLogout} style={{
            display:'flex',alignItems:'center',gap:'4px',
            padding:'6px 12px',borderRadius:'9999px',
            border:`1px solid rgba(0,0,0,0.3)`,background:'none',
            color:LINKEDIN_COLORS.textSecondary,fontSize:'14px',fontWeight:600,
            cursor:'pointer',fontFamily:LINKEDIN_FONT
          }}>
            <LogOut style={{width:'14px',height:'14px'}} />
            Quitter
          </button>
        </div>
      </nav>

      <div style={{
        marginTop:'52px',
        minHeight:'calc(100vh - 52px)',
        background:LINKEDIN_COLORS.background,
        display:'flex',
        justifyContent:'center',
        padding:'24px 16px',
        gap:'20px'
      }}>
        <aside style={{
          width:'225px',flexShrink:0,
          position:'sticky',top:'72px',
          alignSelf:'flex-start',
          display:'flex',flexDirection:'column',gap:'8px'
        }}>
          <div style={{
            background:LINKEDIN_COLORS.white,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,
            borderRadius:'8px',overflow:'hidden',textAlign:'center'
          }}>
            <div style={{height:'56px',background:`linear-gradient(135deg, ${LINKEDIN_COLORS.primaryBlue} 0%, ${LINKEDIN_COLORS.hoverBlue} 100%)`}} />
            <div style={{marginTop:'-20px',display:'flex',justifyContent:'center'}}>
              <div style={{
                width:'40px',height:'40px',borderRadius:'50%',
                background:LINKEDIN_COLORS.primaryBlue,border:`2px solid ${LINKEDIN_COLORS.white}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                color:LINKEDIN_COLORS.white,fontWeight:700,fontSize:'16px'
              }}>
                {(profile?.full_name||profile?.email||'U')[0].toUpperCase()}
              </div>
            </div>
            <div style={{padding:'8px 16px 16px'}}>
              <p style={{fontWeight:700,fontSize:'14px',color:LINKEDIN_COLORS.textPrimary}}>
                {profile?.full_name||profile?.email}
              </p>
              <p style={{fontSize:'11px',color:'rgba(0,0,0,0.5)',marginTop:'2px'}}>
                Content Creator
              </p>
            </div>
            <div style={{borderTop:`1px solid ${LINKEDIN_COLORS.borderColor}`,padding:'12px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                <span style={{fontSize:'12px',color:LINKEDIN_COLORS.textSecondary}}>Posts créés</span>
                <span style={{fontSize:'12px',fontWeight:700,color:LINKEDIN_COLORS.primaryBlue}}>{posts.length}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:'12px',color:LINKEDIN_COLORS.textSecondary}}>Publiés</span>
                <span style={{fontSize:'12px',fontWeight:700,color:LINKEDIN_COLORS.green}}>{publishedCount}</span>
              </div>
            </div>
          </div>

          <div style={{
            background:LINKEDIN_COLORS.white,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,
            borderRadius:'8px',padding:'12px 16px'
          }}>
            <p style={{fontSize:'13px',fontWeight:600,color:'rgba(0,0,0,0.7)',marginBottom:'8px'}}>
              Compte LinkedIn
            </p>
            {profile?.linkedin_connected?(
              <div>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:LINKEDIN_COLORS.green}} />
                  <span style={{fontSize:'13px',color:LINKEDIN_COLORS.green,fontWeight:600}}>Connecté</span>
                </div>
                <p style={{fontSize:'12px',color:LINKEDIN_COLORS.textSecondary,marginBottom:'8px'}}>
                  {profile.linkedin_name}
                </p>
                <button onClick={handleDisconnectLinkedIn} style={{
                  fontSize:'12px',color:LINKEDIN_COLORS.textSecondary,
                  border:'none',background:'none',cursor:'pointer',
                  textDecoration:'underline',fontFamily:LINKEDIN_FONT
                }}>
                  Déconnecter
                </button>
              </div>
            ):(
              <div>
                <p style={{fontSize:'12px',color:LINKEDIN_COLORS.textSecondary,marginBottom:'10px'}}>
                  Connectez LinkedIn pour publier automatiquement
                </p>
                <button onClick={handleConnectLinkedIn} style={{
                  width:'100%',padding:'8px',borderRadius:'9999px',
                  background:LINKEDIN_COLORS.primaryBlue,color:LINKEDIN_COLORS.white,
                  fontSize:'13px',fontWeight:600,border:'none',cursor:'pointer',
                  fontFamily:LINKEDIN_FONT
                }}>
                  Connecter LinkedIn
                </button>
              </div>
            )}
          </div>
        </aside>

        <main style={{flex:1,maxWidth:'760px',display:'flex',flexDirection:'column',gap:'12px'}}>
          <div style={{
            background:LINKEDIN_COLORS.white,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,
            borderRadius:'8px',padding:'16px'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{
                width:'40px',height:'40px',borderRadius:'50%',
                background:LINKEDIN_COLORS.primaryBlue,flexShrink:0,
                display:'flex',alignItems:'center',justifyContent:'center',
                color:LINKEDIN_COLORS.white,fontWeight:700,fontSize:'16px'
              }}>
                {(profile?.full_name||'U')[0].toUpperCase()}
              </div>
              <button
                onClick={() => setShowEditor(true)}
                style={{
                  flex:1,padding:'12px 16px',borderRadius:'9999px',
                  border:`1px solid rgba(0,0,0,0.4)`,background:'none',
                  color:LINKEDIN_COLORS.textSecondary,fontSize:'15px',
                  textAlign:'left',cursor:'pointer',
                  fontFamily:LINKEDIN_FONT,
                  transition:'background 120ms ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Rédiger un post...
              </button>
            </div>
            <div style={{display:'flex',gap:'4px',marginTop:'12px',paddingTop:'12px',borderTop:`1px solid ${LINKEDIN_COLORS.borderColor}`}}>
              <button onClick={() => setShowEditor(true)} style={{
                display:'flex',alignItems:'center',gap:'6px',
                padding:'8px 14px',borderRadius:'4px',border:'none',background:'none',
                cursor:'pointer',color:LINKEDIN_COLORS.textSecondary,fontSize:'14px',fontWeight:600,
                fontFamily:LINKEDIN_FONT,
                transition:'background 120ms ease'
              }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.04)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <Plus style={{width:'18px',height:'18px',color:'#378FE9'}} />
                Nouveau post
              </button>
              <button onClick={() => setShowBulkImport(true)} style={{
                display:'flex',alignItems:'center',gap:'6px',
                padding:'8px 14px',borderRadius:'4px',border:'none',background:'none',
                cursor:'pointer',color:LINKEDIN_COLORS.textSecondary,fontSize:'14px',fontWeight:600,
                fontFamily:LINKEDIN_FONT,
                transition:'background 120ms ease'
              }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.04)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <Upload style={{width:'18px',height:'18px',color:'#5F9B41'}} />
                Import en masse
              </button>
            </div>
          </div>

          <div style={{
            background:LINKEDIN_COLORS.white,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,
            borderRadius:'8px',overflow:'hidden'
          }}>
            <div style={{
              padding:'16px 20px 0',
              display:'flex',gap:'0',borderBottom:`1px solid ${LINKEDIN_COLORS.borderColor}`
            }}>
              {['calendar','posts','analytics'].map(tab=>(
                <button key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  style={{
                    padding:'12px 16px',
                    border:'none',background:'none',
                    fontSize:'14px',fontWeight:600,
                    color:activeTab===tab?LINKEDIN_COLORS.textPrimary:LINKEDIN_COLORS.textSecondary,
                    cursor:'pointer',
                    borderBottom:activeTab===tab?`2px solid ${LINKEDIN_COLORS.primaryBlue}`:'2px solid transparent',
                    fontFamily:LINKEDIN_FONT,
                    transition:'all 120ms ease',
                    marginBottom:'-1px'
                  }}
                >
                  {tab==='calendar'?'Calendrier':tab==='posts'?'Mes posts':'Analytics'}
                </button>
              ))}
            </div>

            <div style={{padding:'20px'}}>
              <AnimatePresence mode="wait">
                {activeTab==='calendar'&&(
                  <motion.div key="calendar" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.3}}>
                    <CalendarView
                      posts={posts}
                      onDayClick={handleDayClick}
                      onPostClick={(post)=>setPreviewPost(post as Post)}
                    />
                  </motion.div>
                )}

                {activeTab==='posts'&&(
                  <motion.div key="posts" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.3}}>
                    <PostsTable
                      posts={posts}
                      currentPage={currentPage}
                      setCurrentPage={setCurrentPage}
                      POSTS_PER_PAGE={POSTS_PER_PAGE}
                      confirmDeleteId={confirmDeleteId}
                      setConfirmDeleteId={setConfirmDeleteId}
                      deletingId={deletingId}
                      retryingId={retryingId}
                      handleDeletePost={handleDeletePost}
                      handleRetryPost={handleRetryPost}
                      setPreviewPost={setPreviewPost}
                      openEditModal={openEditModal}
                    />
                  </motion.div>
                )}

                {activeTab==='analytics'&&(
                  <motion.div key="analytics" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.3}}>
                    <div style={{
                      borderRadius:'8px',padding:'48px',textAlign:'center',
                      background:LINKEDIN_COLORS.lightBlueBg,border:`1px solid ${LINKEDIN_COLORS.borderColor}`
                    }}>
                      <BarChart3 style={{width:'64px',height:'64px',margin:'0 auto 20px',color:LINKEDIN_COLORS.textSecondary}} />
                      <h3 style={{fontWeight:700,fontSize:'18px',color:LINKEDIN_COLORS.textPrimary,marginBottom:'8px'}}>Analytics bientôt disponibles</h3>
                      <p style={{fontSize:'14px',color:LINKEDIN_COLORS.textSecondary,maxWidth:'400px',margin:'0 auto'}}>
                        Les analytics seront disponibles une fois que tu auras connecté ton LinkedIn et publié quelques posts.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {previewPost&&(
              <LinkedInPreview
                content={previewPost.content}
                scheduledAt={previewPost.scheduled_at}
                status={previewPost.status}
                authorName={profile?.linkedin_name||profile?.full_name||'André Isoz'}
                authorHeadline="Conseiller financier | Brevet Fédéral"
                authorAvatar={profile?.linkedin_picture_url}
                images={previewPost.images||[]}
                onClose={()=>setPreviewPost(null)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showBulkImport&&(
              <BulkImport
                onImport={handleBulkImport}
                onClose={()=>setShowBulkImport(false)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {editingPost&&(
              <motion.div
                initial={{opacity:0}}
                animate={{opacity:1}}
                exit={{opacity:0}}
                transition={{duration:0.2}}
                onClick={()=>setEditingPost(null)}
                style={{
                  position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',
                  backdropFilter:'blur(4px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',
                  padding:'16px'
                }}
              >
                <motion.div
                  initial={{opacity:0,scale:0.95,y:20}}
                  animate={{opacity:1,scale:1,y:0}}
                  exit={{opacity:0,scale:0.95,y:20}}
                  transition={{duration:0.3,ease:"easeOut"}}
                  onClick={(e)=>e.stopPropagation()}
                  style={{
                    borderRadius:'8px',width:'100%',maxWidth:'480px',
                    background:LINKEDIN_COLORS.white,boxShadow:'0 16px 40px rgba(0,0,0,0.16)',
                    border:`1px solid ${LINKEDIN_COLORS.borderColor}`,overflow:'hidden'
                  }}
                >
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:`1px solid ${LINKEDIN_COLORS.borderColor}`}}>
                    <h2 style={{fontWeight:700,fontSize:'16px',color:LINKEDIN_COLORS.textPrimary}}>Modifier le post</h2>
                    <button onClick={()=>setEditingPost(null)} style={{padding:'8px',borderRadius:'8px',color:LINKEDIN_COLORS.primaryBlue,background:'none',border:'none',cursor:'pointer'}}>
                      <X style={{width:'18px',height:'18px'}} />
                    </button>
                  </div>
                  <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'16px'}}>
                    <div>
                      <label style={{display:'block',fontSize:'13px',fontWeight:600,color:LINKEDIN_COLORS.textPrimary,marginBottom:'8px'}}>Contenu</label>
                      <textarea
                        value={editContent}
                        onChange={e=>setEditContent(e.target.value)}
                        rows={10}
                        style={{
                          width:'100%',padding:'12px 14px',borderRadius:'6px',fontSize:'13px',resize:'none',fontFamily:LINKEDIN_FONT,
                          outline:'none',background:LINKEDIN_COLORS.lightBlueBg,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,
                          color:LINKEDIN_COLORS.textPrimary,transition:'all 120ms ease'
                        }}
                        onFocus={(e)=>e.currentTarget.style.borderColor=LINKEDIN_COLORS.primaryBlue}
                        onBlur={(e)=>e.currentTarget.style.borderColor=LINKEDIN_COLORS.borderColor}
                      />
                      <p style={{fontSize:'11px',marginTop:'6px',textAlign:'right',color:LINKEDIN_COLORS.textSecondary}}>{editContent.length} caractères</p>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:LINKEDIN_COLORS.textPrimary,marginBottom:'8px'}}>Date</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={e=>setEditDate(e.target.value)}
                          style={{
                            width:'100%',padding:'10px 12px',borderRadius:'6px',fontSize:'13px',outline:'none',
                            background:LINKEDIN_COLORS.lightBlueBg,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,color:LINKEDIN_COLORS.textPrimary,transition:'all 120ms ease'
                          }}
                          onFocus={(e)=>e.currentTarget.style.borderColor=LINKEDIN_COLORS.primaryBlue}
                          onBlur={(e)=>e.currentTarget.style.borderColor=LINKEDIN_COLORS.borderColor}
                        />
                      </div>
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:LINKEDIN_COLORS.textPrimary,marginBottom:'8px'}}>Heure</label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={e=>setEditTime(e.target.value)}
                          style={{
                            width:'100%',padding:'10px 12px',borderRadius:'6px',fontSize:'13px',outline:'none',
                            background:LINKEDIN_COLORS.lightBlueBg,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,color:LINKEDIN_COLORS.textPrimary,transition:'all 120ms ease'
                          }}
                          onFocus={(e)=>e.currentTarget.style.borderColor=LINKEDIN_COLORS.primaryBlue}
                          onBlur={(e)=>e.currentTarget.style.borderColor=LINKEDIN_COLORS.borderColor}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'12px',padding:'16px 24px',borderTop:`1px solid ${LINKEDIN_COLORS.borderColor}`}}>
                    <button
                      onClick={()=>setEditingPost(null)}
                      style={{
                        padding:'8px 16px',fontSize:'13px',borderRadius:'6px',color:LINKEDIN_COLORS.textSecondary,
                        background:'none',border:`1px solid ${LINKEDIN_COLORS.borderColor}`,cursor:'pointer',transition:'all 120ms ease',fontFamily:LINKEDIN_FONT
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      style={{
                        display:'flex',alignItems:'center',gap:'8px',padding:'8px 18px',fontSize:'13px',fontWeight:600,
                        borderRadius:'6px',background:LINKEDIN_COLORS.primaryBlue,
                        color:LINKEDIN_COLORS.white,border:'none',cursor:'pointer',opacity:savingEdit?0.7:1,transition:'all 120ms ease',
                        fontFamily:LINKEDIN_FONT
                      }}
                    >
                      {savingEdit?<Loader2 style={{width:'14px',height:'14px',animation:'spin 1s linear infinite'}} />:<Check style={{width:'14px',height:'14px'}} />}
                      Enregistrer
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showEditor&&(
              <motion.div
                initial={{opacity:0}}
                animate={{opacity:1}}
                exit={{opacity:0}}
                transition={{duration:0.2}}
                onClick={()=>setShowEditor(false)}
                style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
              >
                <motion.div
                  initial={{opacity:0,scale:0.95,y:20}}
                  animate={{opacity:1,scale:1,y:0}}
                  exit={{opacity:0,scale:0.95,y:20}}
                  transition={{duration:0.3,ease:"easeOut"}}
                  onClick={(e)=>e.stopPropagation()}
                  style={{width:'100%',maxWidth:'720px',maxHeight:'90vh',overflow:'auto'}}
                >
                  <PostEditor
                    onSave={handleSavePost}
                    onClose={()=>setShowEditor(false)}
                    initialDate={selectedDate}
                    templates={defaultTemplates}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <aside style={{
          width:'220px',flexShrink:0,
          position:'sticky',top:'72px',
          alignSelf:'flex-start',
          display:'flex',flexDirection:'column',gap:'8px'
        }}>
          <div style={{background:LINKEDIN_COLORS.white,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,borderRadius:'8px',padding:'16px'}}>
            <h3 style={{fontSize:'14px',fontWeight:700,color:LINKEDIN_COLORS.textPrimary,marginBottom:'12px'}}>
              Vue d'ensemble
            </h3>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {[
                {label:'Posts totaux',value:posts.length,color:LINKEDIN_COLORS.textPrimary},
                {label:'Programmés',value:scheduledCount,color:LINKEDIN_COLORS.primaryBlue},
                {label:'Publiés',value:publishedCount,color:LINKEDIN_COLORS.green},
                {label:'Brouillons',value:draftCount,color:LINKEDIN_COLORS.textSecondary},
              ].map(stat=>(
                <div key={stat.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'13px',color:LINKEDIN_COLORS.textSecondary}}>{stat.label}</span>
                  <span style={{fontSize:'15px',fontWeight:700,color:stat.color}}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:LINKEDIN_COLORS.white,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,borderRadius:'8px',padding:'16px'}}>
            <h3 style={{fontSize:'13px',fontWeight:700,color:LINKEDIN_COLORS.textSecondary,marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
              💡 Conseil
            </h3>
            <p style={{fontSize:'13px',color:LINKEDIN_COLORS.textSecondary,lineHeight:'1.5'}}>
              Les posts publiés entre 8h et 10h ont 3x plus d'engagement sur LinkedIn.
            </p>
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function PostsTable({posts,currentPage,setCurrentPage,POSTS_PER_PAGE,confirmDeleteId,setConfirmDeleteId,deletingId,retryingId,handleDeletePost,handleRetryPost,setPreviewPost,openEditModal}:{posts:Post[],currentPage:number,setCurrentPage:(page:number)=>void,POSTS_PER_PAGE:number,confirmDeleteId:string|null,setConfirmDeleteId:(id:string|null)=>void,deletingId:string|null,retryingId:string|null,handleDeletePost:(id:string)=>Promise<void>,handleRetryPost:(post:Post)=>Promise<void>,setPreviewPost:(post:Post|null)=>void,openEditModal:(post:Post)=>void}) {
  const totalPages=Math.ceil(posts.length/POSTS_PER_PAGE)
  const paginated=posts.slice((currentPage-1)*POSTS_PER_PAGE,currentPage*POSTS_PER_PAGE)

  return (
    <div style={{borderRadius:'8px',overflow:'hidden',background:LINKEDIN_COLORS.white,border:`1px solid ${LINKEDIN_COLORS.borderColor}`}}>
      <div style={{padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${LINKEDIN_COLORS.borderColor}`}}>
        <h3 style={{fontWeight:700,fontSize:'16px',color:LINKEDIN_COLORS.textPrimary}}>Tous les posts</h3>
        <span style={{fontSize:'12px',color:LINKEDIN_COLORS.textSecondary}}>{posts.length} post{posts.length>1?'s':''} au total</span>
      </div>
      <div>
        {posts.length===0?(
          <div style={{padding:'48px 24px',textAlign:'center'}}>
            <p style={{fontSize:'16px',marginBottom:'8px',fontWeight:600,color:LINKEDIN_COLORS.textPrimary}}>Aucun post pour l'instant</p>
            <p style={{fontSize:'13px',color:LINKEDIN_COLORS.textSecondary}}>Clique sur "Nouveau post" ou "Importer" pour commencer !</p>
          </div>
        ):(
          <>
            {paginated.map((post)=>{
              const d=new Date(post.scheduled_at)
              const isConfirmingDelete=confirmDeleteId===post.id
              const isDeleting=deletingId===post.id
              const isRetrying=retryingId===post.id
              const statusBg={'scheduled':LINKEDIN_COLORS.lightBlueBg,'published':LINKEDIN_COLORS.greenBg,'failed':LINKEDIN_COLORS.redBg,'draft':'rgba(0,0,0,0.05)'}[post.status]||'rgba(0,0,0,0.05)'
              const statusColor={'scheduled':LINKEDIN_COLORS.primaryBlue,'published':LINKEDIN_COLORS.green,'failed':LINKEDIN_COLORS.red,'draft':LINKEDIN_COLORS.textSecondary}[post.status]||LINKEDIN_COLORS.textSecondary
              const statusLabel={'scheduled':'⏰ Programmé','published':'✓ Publié','failed':'✗ Échoué','draft':'Brouillon'}[post.status]||'Brouillon'
              return (
                <div key={post.id} style={{padding:'16px 24px',display:'flex',alignItems:'flex-start',gap:'12px',borderBottom:`1px solid ${LINKEDIN_COLORS.borderColor}`,background:'transparent',transition:'background 120ms ease'}} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(0,0,0,0.02)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                  <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{
                      width:'40px',height:'40px',borderRadius:'50%',
                      background:LINKEDIN_COLORS.primaryBlue,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:LINKEDIN_COLORS.white,fontWeight:700,fontSize:'15px'
                    }}>
                      {(post.content.charAt(0)||'C').toUpperCase()}
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
                      <div>
                        <span style={{fontWeight:700,fontSize:'14px',color:LINKEDIN_COLORS.textPrimary}}>
                          Post ·
                        </span>
                        <span style={{fontSize:'13px',color:LINKEDIN_COLORS.textSecondary}}>
                          {d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
                        </span>
                      </div>
                      <span style={{
                        padding:'2px 10px',borderRadius:'9999px',fontSize:'12px',fontWeight:600,
                        background:statusBg,color:statusColor
                      }}>
                        {statusLabel}
                      </span>
                    </div>
                    <p style={{fontSize:'14px',color:LINKEDIN_COLORS.textPrimary,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',lineHeight:'1.5'}}>
                      {post.content.replace(/<[^>]+>/g,'').slice(0,250)}
                    </p>
                    <div style={{display:'flex',gap:'12px',marginTop:'8px'}}>
                      <button onClick={()=>setPreviewPost(post)} style={{fontSize:'13px',color:LINKEDIN_COLORS.textSecondary,border:'none',background:'none',cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:'4px',padding:'4px 8px',borderRadius:'4px'}}>
                        <Eye style={{width:'14px',height:'14px'}} /> Aperçu
                      </button>
                      {post.status!=='published'&&(
                        <button onClick={()=>openEditModal(post)} style={{fontSize:'13px',color:LINKEDIN_COLORS.textSecondary,border:'none',background:'none',cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:'4px',padding:'4px 8px',borderRadius:'4px'}}>
                          <Pencil style={{width:'14px',height:'14px'}} /> Modifier
                        </button>
                      )}
                      {post.status==='failed'&&(
                        <button onClick={()=>handleRetryPost(post)} disabled={isRetrying} style={{fontSize:'13px',color:'#B8860B',border:'none',background:'none',cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:'4px',padding:'4px 8px',borderRadius:'4px',opacity:isRetrying?0.6:1}}>
                          {isRetrying?<Loader2 style={{width:'14px',height:'14px',animation:'spin 1s linear infinite'}} />:<RefreshCw style={{width:'14px',height:'14px'}} />}Réessayer
                        </button>
                      )}
                      <button onClick={()=>setConfirmDeleteId(post.id)} style={{fontSize:'13px',color:LINKEDIN_COLORS.red,border:'none',background:'none',cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:'4px',padding:'4px 8px',borderRadius:'4px'}}>
                        <Trash2 style={{width:'14px',height:'14px'}} />
                      </button>
                    </div>
                    {isConfirmingDelete&&(
                      <div style={{marginTop:'8px',display:'flex',gap:'8px',alignItems:'center'}}>
                        <span style={{fontSize:'12px',color:LINKEDIN_COLORS.textSecondary}}>Êtes-vous sûr ?</span>
                        <button onClick={()=>handleDeletePost(post.id)} disabled={isDeleting} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',fontWeight:600,borderRadius:'4px',background:LINKEDIN_COLORS.red,color:LINKEDIN_COLORS.white,border:'none',cursor:'pointer',opacity:isDeleting?0.6:1}}>
                          {isDeleting?<Loader2 style={{width:'12px',height:'12px',animation:'spin 1s linear infinite'}} />:<Check style={{width:'12px',height:'12px'}} />}
                          Supprimer
                        </button>
                        <button onClick={()=>setConfirmDeleteId(null)} style={{padding:'4px 10px',fontSize:'11px',borderRadius:'4px',color:LINKEDIN_COLORS.textSecondary,background:LINKEDIN_COLORS.lightBlueBg,border:'none',cursor:'pointer'}}>Annuler</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {totalPages>1&&(
              <div style={{padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:`1px solid ${LINKEDIN_COLORS.borderColor}`}}>
                <span style={{fontSize:'12px',color:LINKEDIN_COLORS.textSecondary}}>Page {currentPage}/{totalPages} · {posts.length} posts</span>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <button onClick={()=>setCurrentPage(Math.max(1,currentPage-1))} disabled={currentPage===1} style={{padding:'6px 12px',fontSize:'12px',fontWeight:600,borderRadius:'6px',color:LINKEDIN_COLORS.textPrimary,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,background:LINKEDIN_COLORS.white,cursor:'pointer',opacity:currentPage===1?0.4:1}}>← Précédent</button>
                  <button onClick={()=>setCurrentPage(Math.min(totalPages,currentPage+1))} disabled={currentPage===totalPages} style={{padding:'6px 12px',fontSize:'12px',fontWeight:600,borderRadius:'6px',color:LINKEDIN_COLORS.textPrimary,border:`1px solid ${LINKEDIN_COLORS.borderColor}`,background:LINKEDIN_COLORS.white,cursor:'pointer',opacity:currentPage===totalPages?0.4:1}}>Suivant →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
