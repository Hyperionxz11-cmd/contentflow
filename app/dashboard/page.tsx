'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, LogOut, Plus, Calendar as CalendarIcon,
  LayoutGrid, BarChart3, Linkedin, Upload,
  Pencil, Trash2, Eye, X, Check, Loader2,
  FileText, Clock, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, TrendingUp, Layers
} from 'lucide-react'
import CalendarView from '@/components/calendar/CalendarView'
import PostEditor from '@/components/post/PostEditor'
import BulkImport from '@/components/dashboard/BulkImport'
import LinkedInPreview from '@/components/linkedin/LinkedInPreview'
import Analytics from '@/components/analytics/Analytics'
import CarouselBuilder from '@/components/carousel/CarouselBuilder'
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
  const [showCarousel, setShowCarousel] = useState(false)
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')
  const POSTS_PER_PAGE = 20
  const FREE_PLAN_LIMIT = 3
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
    // Vérifier limite plan gratuit
    if (profile && profile.plan === 'free') {
      const thisMonthPosts = posts.filter(p => {
        const d = new Date(p.scheduled_at)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      if (thisMonthPosts.length >= FREE_PLAN_LIMIT) {
        setUpgradeReason(`Tu as atteint la limite de ${FREE_PLAN_LIMIT} posts/mois du plan gratuit.`)
        setShowUpgradeModal(true)
        setShowEditor(false)
        return
      }
    }
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
    if (profile?.plan === 'free' && importedPosts.length > FREE_PLAN_LIMIT) {
      setUpgradeReason(`Le plan gratuit permet ${FREE_PLAN_LIMIT} posts/mois. Tu essaies d'en planifier ${importedPosts.length}.`)
      setShowUpgradeModal(true)
      return
    }
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
    // Ne pas fermer ici — BulkImport affiche l'écran de succès puis appelle onClose lui-même
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

  /** Drag & drop : reprogramme un post sur une nouvelle date (conserve l'heure originale) */
  const handleReschedule = async (postId: string, newDate: string) => {
    if (!user) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const originalTime = new Date(post.scheduled_at)
    const [y, m, d] = newDate.split('-').map(Number)
    const newScheduledAt = new Date(
      y, m - 1, d,
      originalTime.getHours(),
      originalTime.getMinutes(),
      0
    ).toISOString()
    const supabase = createClient()
    const { error } = await supabase.from('posts').update({ scheduled_at: newScheduledAt }).eq('id', postId)
    if (!error) {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, scheduled_at: newScheduledAt } : p
      ))
    }
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

  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  if (loading) {
    return (
      <div style={{minHeight:'100vh',background:'#050508',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'24px'}}>
          <div style={{position:'relative',width:'56px',height:'56px'}}>
            <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'2px solid rgba(124,58,237,0.15)'}} />
            <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#A78BFA',animation:'spin 1s linear infinite'}} />
            <div style={{position:'absolute',inset:'8px',borderRadius:'50%',background:'rgba(124,58,237,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Zap style={{width:'18px',height:'18px',color:'#A78BFA'}} />
            </div>
          </div>
          <div>
            <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'16px',color:'#E5E7EB',textAlign:'center'}}>ContentFlow</p>
            <p style={{fontSize:'12px',color:'#9CA3AF',letterSpacing:'0.1em',textTransform:'uppercase',textAlign:'center',marginTop:'4px'}}>Chargement…</p>
          </div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:'#050508',position:'relative',overflow:'hidden'}}>

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <div style={{
          position:'fixed',inset:0,zIndex:200,
          background:'rgba(0,0,0,0.6)',backdropFilter:'blur(20px)',
          display:'flex',alignItems:'center',justifyContent:'center',padding:16,
        }}>
          <div style={{
            background:'#111116',border:'1px solid rgba(124,58,237,0.25)',
            borderRadius:24,padding:'32px 28px',maxWidth:400,width:'100%',
            boxShadow:'0 40px 80px rgba(0,0,0,0.5)',
          }}>
            <div style={{textAlign:'center',marginBottom:24}}>
              <div style={{
                width:64,height:64,borderRadius:'50%',
                background:'rgba(124,58,237,0.15)',
                display:'flex',alignItems:'center',justifyContent:'center',
                margin:'0 auto 16px',
              }}>
                <Zap style={{width:28,height:28,color:'#A78BFA'}} />
              </div>
              <h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:'#E5E7EB',margin:'0 0 8px',letterSpacing:'-0.02em'}}>
                Limite atteinte
              </h2>
              <p style={{fontSize:13,color:'#9CA3AF',lineHeight:1.6,margin:0}}>
                {upgradeReason} Passe en Solo ou Agence pour publier sans limite.
              </p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
              {[
                {plan:'Solo',price:'9€/mois',posts:'50 posts/mois',ai:'5 imports IA · 20 reformulations',color:'#6366f1'},
                {plan:'Agence',price:'29€/mois',posts:'Posts illimités',ai:'20 imports IA · 80 reformulations',color:'#A78BFA'},
              ].map(p => (
                <button key={p.plan}
                  onClick={() => { window.location.href = '/api/stripe/checkout?plan=' + p.plan.toLowerCase(); }}
                  style={{
                    display:'flex',alignItems:'center',justifyContent:'space-between',
                    padding:'14px 16px',borderRadius:14,border:`1.5px solid ${p.color}33`,
                    background:`${p.color}0d`,cursor:'pointer',textAlign:'left',
                  }}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#E5E7EB'}}>{p.plan} — {p.price}</div>
                    <div style={{fontSize:11,color:'#9CA3AF',marginTop:3}}>{p.posts} · {p.ai}</div>
                  </div>
                  <div style={{
                    padding:'6px 14px',borderRadius:999,
                    background:p.color,color:'#fff',
                    fontSize:12,fontWeight:700,whiteSpace:'nowrap',
                  }}>Choisir →</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowUpgradeModal(false)}
              style={{width:'100%',padding:'10px',borderRadius:999,border:'1px solid rgba(255,255,255,0.08)',
                background:'transparent',color:'#6B7280',fontSize:13,cursor:'pointer'}}>
              Plus tard
            </button>
          </div>
        </div>
      )}

      {/* Background orbs */}
      <div style={{position:'absolute',top:'-40%',left:'-10%',width:'400px',height:'400px',borderRadius:'50%',background:'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',filter:'blur(80px)',zIndex:0}} />
      <div style={{position:'absolute',bottom:'-20%',right:'-15%',width:'350px',height:'350px',borderRadius:'50%',background:'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',filter:'blur(100px)',zIndex:0}} />

      <div style={{position:'relative',zIndex:1,display:'flex',minHeight:'100vh'}}>
        {/* SIDEBAR */}
        <motion.aside
          initial={{x:-240}}
          animate={{x:0}}
          transition={{duration:0.5,ease: "easeOut"}}
          style={{
            position:'fixed',
            left:0,
            top:0,
            height:'100vh',
            width:'240px',
            background:'#080812',
            borderRight:'1px solid rgba(124,58,237,0.15)',
            boxShadow:'inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 20px rgba(0,0,0,0.3)',
            display:'flex',
            flexDirection:'column',
            zIndex:40,
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{opacity:0,y:-10}}
            animate={{opacity:1,y:0}}
            transition={{delay:0.1,duration:0.5}}
            style={{padding:'24px 24px 20px'}}
          >
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'32px'}}>
              <div style={{
                width:'32px',height:'32px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',
                background:'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                boxShadow:'0 0 20px rgba(124,58,237,0.6)',
                flexShrink:0
              }}>
                <Zap style={{width:'16px',height:'16px',color:'white'}} />
              </div>
              <span style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'16px',color:'#E5E7EB',letterSpacing:'-0.01em'}}>ContentFlow</span>
            </div>

            {/* Nav */}
            <nav style={{display:'flex',flexDirection:'column',gap:'2px'}}>
              {[
                { id: 'calendar' as const, icon: CalendarIcon, label: 'Calendrier' },
                { id: 'posts' as const, icon: LayoutGrid, label: 'Mes posts' },
                { id: 'analytics' as const, icon: BarChart3, label: 'Analytics' },
              ].map((item,idx) => (
                <motion.button
                  key={item.id}
                  initial={{opacity:0,x:-20}}
                  animate={{opacity:1,x:0}}
                  transition={{delay:0.15+idx*0.05,duration:0.4}}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width:'100%',
                    display:'flex',
                    alignItems:'center',
                    gap:'12px',
                    padding:'8px 12px',
                    borderRadius:'10px',
                    fontSize:'13px',
                    fontWeight:500,
                    textAlign:'left',
                    border:'none',
                    cursor:'pointer',
                    transition:'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                    background:activeTab===item.id?'rgba(124,58,237,0.12)':'transparent',
                    color:activeTab===item.id?'#A78BFA':'#9CA3AF',
                    boxShadow:activeTab===item.id?'inset 0 0 20px rgba(124,58,237,0.06)':'none',
                    position:'relative'
                  }}
                  onMouseEnter={(e)=>{
                    if(activeTab!==item.id) {
                      e.currentTarget.style.background='rgba(124,58,237,0.06)'
                      e.currentTarget.style.color='#C4B5FD'
                    }
                  }}
                  onMouseLeave={(e)=>{
                    if(activeTab!==item.id) {
                      e.currentTarget.style.background='transparent'
                      e.currentTarget.style.color='#9CA3AF'
                    }
                  }}
                >
                  <item.icon style={{
                    width:'16px',
                    height:'16px',
                    filter:activeTab===item.id?'drop-shadow(0 0 8px rgba(124,58,237,0.8))':'none'
                  }} />
                  {item.label}
                </motion.button>
              ))}
            </nav>
          </motion.div>

          {/* LinkedIn + Plan sections */}
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            transition={{delay:0.3,duration:0.5}}
            style={{flex:1,overflow:'auto',padding:'0 16px'}}
          >
            {/* LinkedIn */}
            <div style={{
              marginTop:'16px',
              padding:'16px',
              borderRadius:'12px',
              background:'rgba(255,255,255,0.025)',
              border:'1px solid rgba(255,255,255,0.06)',
              fontSize:'13px'
            }}>
              {profile?.linkedin_connected?(
                <div>
                  {/* Photo LinkedIn + nom */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                    {profile.linkedin_picture_url ? (
                      <img
                        src={profile.linkedin_picture_url}
                        alt="LinkedIn"
                        style={{width:'36px',height:'36px',borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(16,185,129,0.4)',flexShrink:0}}
                      />
                    ) : (
                      <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#7C3AED,#A78BFA)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:700,color:'white',flexShrink:0}}>
                        {(profile.linkedin_name||profile.full_name||'?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#10B981',flexShrink:0}} />
                        <span style={{fontSize:'10px',fontWeight:600,color:'#10B981'}}>Connecté</span>
                      </div>
                      <p style={{fontSize:'11px',color:'#D1D5DB',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:'2px',fontWeight:500}}>
                        {profile.linkedin_name||profile.full_name||'Compte vérifié'}
                      </p>
                    </div>
                    <button onClick={handleDisconnectLinkedIn} style={{fontSize:'10px',fontWeight:500,color:'#EF4444',background:'none',border:'none',cursor:'pointer',flexShrink:0}}>
                      Déco
                    </button>
                  </div>
                </div>
              ):(
                <div>
                  <p style={{fontSize:'11px',color:'#9CA3AF',marginBottom:'12px'}}>Connecte LinkedIn pour publier</p>
                  <button
                    onClick={handleConnectLinkedIn}
                    style={{
                      width:'100%',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',
                      padding:'8px 12px',borderRadius:'8px',fontSize:'12px',fontWeight:600,
                      background:'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                      color:'white',border:'none',cursor:'pointer',
                      boxShadow:'0 0 16px rgba(124,58,237,0.3)',transition:'all 0.3s'
                    }}
                    onMouseEnter={(e)=>{e.currentTarget.style.boxShadow='0 0 24px rgba(124,58,237,0.5)'}}
                    onMouseLeave={(e)=>{e.currentTarget.style.boxShadow='0 0 16px rgba(124,58,237,0.3)'}}
                  >
                    <Linkedin style={{width:'14px',height:'14px'}} />
                    Connecter
                  </button>
                </div>
              )}
            </div>

            {/* Plan */}
            <div style={{
              marginTop:'12px',
              padding:'16px',
              borderRadius:'12px',
              background:'rgba(255,255,255,0.025)',
              border:'1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'11px'}}>
                <span style={{color:'#9CA3AF'}}>Plan actuel</span>
                <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#A78BFA'}}>
                  {profile?.plan||'Free'}
                </span>
              </div>
              {(!profile||profile.plan==='free')&&(
                <button
                  onClick={()=>router.push('/pricing')}
                  style={{
                    width:'100%',marginTop:'12px',padding:'8px 12px',borderRadius:'8px',
                    fontSize:'11px',fontWeight:600,border:'1px solid #A78BFA',
                    color:'#A78BFA',background:'transparent',cursor:'pointer',transition:'all 0.3s'
                  }}
                  onMouseEnter={(e)=>{e.currentTarget.style.background='rgba(124,58,237,0.1)'}}
                  onMouseLeave={(e)=>{e.currentTarget.style.background='transparent'}}
                >
                  Passer en Premium ↗
                </button>
              )}
            </div>
          </motion.div>

          {/* User footer */}
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            transition={{delay:0.4,duration:0.5}}
            style={{padding:'16px',borderTop:'1px solid rgba(255,255,255,0.04)',marginTop:'auto'}}
          >
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',minWidth:0}}>
                <div style={{
                  width:'32px',height:'32px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',
                  background:'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                  color:'white',fontSize:'11px',fontWeight:700,flexShrink:0
                }}>
                  {user?.email?.charAt(0).toUpperCase()||'U'}
                </div>
                <span style={{fontSize:'12px',color:'#D1D5DB',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {user?.email}
                </span>
              </div>
              <button onClick={handleLogout} style={{padding:'6px',borderRadius:'8px',color:'#9CA3AF',background:'none',border:'none',cursor:'pointer',transition:'all 0.3s'}}>
                <LogOut style={{width:'16px',height:'16px'}} />
              </button>
            </div>
          </motion.div>
        </motion.aside>

        {/* MAIN CONTENT */}
        <motion.main
          initial={{opacity:0}}
          animate={{opacity:1}}
          transition={{delay:0.2,duration:0.5}}
          style={{marginLeft:'240px',padding:'32px',width:'calc(100% - 240px)',minHeight:'100vh'}}
        >
          {/* Header */}
          <div style={{
            display:'flex',justifyContent:'space-between',alignItems:'flex-start',
            paddingBottom:'24px',borderBottom:'1px solid rgba(255,255,255,0.05)',
            marginBottom:'32px'
          }}>
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:0.3,duration:0.5}}>
              <p style={{fontSize:'12px',color:'#9CA3AF',letterSpacing:'0.08em',textTransform:'uppercase',fontFamily:'monospace',fontWeight:500}}>
                {capitalizedDate}
              </p>
              <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'28px',letterSpacing:'-0.02em',marginTop:'4px',color:'#E5E7EB'}}>
                Bonjour, <span style={{background:'linear-gradient(135deg,#A78BFA 0%,#7C3AED 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                  {profile?.full_name?.split(' ')[0]||'André'}
                </span> 👋
              </h1>
            </motion.div>

            <motion.div
              initial={{opacity:0,y:-10}}
              animate={{opacity:1,y:0}}
              transition={{delay:0.35,duration:0.5}}
              style={{display:'flex',gap:'12px'}}
            >
              {['premium','team','agency'].includes(profile?.plan||'') && (
                <button
                  onClick={()=>setShowCarousel(true)}
                  style={{
                    display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',borderRadius:'10px',
                    fontSize:'14px',fontWeight:500,border:'1px solid rgba(167,139,250,0.3)',
                    color:'#A78BFA',background:'rgba(124,58,237,0.08)',cursor:'pointer',transition:'all 0.3s'
                  }}
                  onMouseEnter={(e)=>{e.currentTarget.style.background='rgba(124,58,237,0.15)'}}
                  onMouseLeave={(e)=>{e.currentTarget.style.background='rgba(124,58,237,0.08)'}}
                >
                  <Layers style={{width:'16px',height:'16px'}} />
                  Carousel
                </button>
              )}
              <button
                onClick={()=>setShowBulkImport(true)}
                style={{
                  display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',borderRadius:'10px',
                  fontSize:'14px',fontWeight:500,border:'1px solid rgba(255,255,255,0.1)',
                  color:'#D1D5DB',background:'rgba(255,255,255,0.02)',cursor:'pointer',transition:'all 0.3s'
                }}
                onMouseEnter={(e)=>{
                  e.currentTarget.style.background='rgba(255,255,255,0.05)'
                  e.currentTarget.style.borderColor='rgba(124,58,237,0.3)'
                }}
                onMouseLeave={(e)=>{
                  e.currentTarget.style.background='rgba(255,255,255,0.02)'
                  e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'
                }}
              >
                <Upload style={{width:'16px',height:'16px'}} />
                Importer
              </button>
              <button
                onClick={()=>{setSelectedDate(new Date().toISOString().split('T')[0]);setShowEditor(true)}}
                style={{
                  display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',borderRadius:'10px',
                  fontSize:'14px',fontWeight:600,background:'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                  color:'white',border:'none',cursor:'pointer',
                  boxShadow:'0 4px 20px rgba(124,58,237,0.3)',transition:'all 0.3s'
                }}
                onMouseEnter={(e)=>{e.currentTarget.style.boxShadow='0 8px 32px rgba(124,58,237,0.4)'}}
                onMouseLeave={(e)=>{e.currentTarget.style.boxShadow='0 4px 20px rgba(124,58,237,0.3)'}}
              >
                <Plus style={{width:'16px',height:'16px'}} />
                Nouveau post
              </button>
            </motion.div>
          </div>

          {/* Stat Cards */}
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            transition={{delay:0.4,duration:0.5}}
            style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:'16px',marginBottom:'32px'}}
          >
            {[
              {icon:FileText,value:totalCount,label:'Posts créés',color:'#A78BFA',delay:0.5},
              {icon:Clock,value:scheduledCount,label:'Posts programmés',color:'#60A5FA',delay:0.55},
              {icon:CheckCircle2,value:publishedCount,label:'Publiés',color:'#34D399',delay:0.6},
            ].map((stat,idx)=>(
              <StatCard key={idx} icon={stat.icon} value={stat.value} label={stat.label} color={stat.color} delay={stat.delay} />
            ))}
          </motion.div>

          {/* Tabs Content */}
          <AnimatePresence mode="wait">
            {activeTab==='calendar'&&(
              <motion.div key="calendar" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.3}}>
                <CalendarView
                  posts={posts}
                  onDayClick={handleDayClick}
                  onPostClick={(post)=>setPreviewPost(post as Post)}
                  onPostReschedule={handleReschedule}
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
                <Analytics
                  posts={posts}
                  isPremium={['premium', 'team', 'agency'].includes(profile?.plan || '')}
                  onUpgrade={() => router.push('/pricing')}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modals */}
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
                isPremium={['premium', 'team', 'agency', 'solo', 'agence'].includes(profile?.plan || '')}
                plan={profile?.plan || 'free'}
                publishedPosts={posts.map(p => ({ scheduled_at: p.scheduled_at, status: p.status }))}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showCarousel&&(
              <CarouselBuilder
                onClose={()=>setShowCarousel(false)}
                onInsert={(content)=>{
                  setSelectedDate(new Date().toISOString().split('T')[0])
                  setShowCarousel(false)
                  setShowEditor(true)
                }}
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
                  transition={{duration:0.3,ease: "easeOut"}}
                  onClick={(e)=>e.stopPropagation()}
                  style={{
                    borderRadius:'16px',width:'100%',maxWidth:'480px',
                    background:'#1A1A22',boxShadow:'0 25px 64px rgba(0,0,0,0.8)',
                    border:'1px solid rgba(255,255,255,0.05)',overflow:'hidden'
                  }}
                >
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                    <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'16px',color:'#E5E7EB'}}>Modifier le post</h2>
                    <button onClick={()=>setEditingPost(null)} style={{padding:'8px',borderRadius:'8px',color:'#9CA3AF',background:'rgba(255,255,255,0.05)',border:'none',cursor:'pointer'}}>
                      <X style={{width:'18px',height:'18px'}} />
                    </button>
                  </div>
                  <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'16px'}}>
                    <div>
                      <label style={{display:'block',fontSize:'13px',fontWeight:500,color:'#D1D5DB',marginBottom:'8px'}}>Contenu</label>
                      <textarea
                        value={editContent}
                        onChange={e=>setEditContent(e.target.value)}
                        rows={10}
                        style={{
                          width:'100%',padding:'12px 14px',borderRadius:'10px',fontSize:'13px',resize:'none',fontFamily:'monospace',
                          outline:'none',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
                          color:'#E5E7EB',transition:'all 0.3s'
                        }}
                        onFocus={(e)=>e.currentTarget.style.borderColor='rgba(124,58,237,0.5)'}
                        onBlur={(e)=>e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}
                      />
                      <p style={{fontSize:'11px',marginTop:'6px',textAlign:'right',color:'#9CA3AF'}}>{editContent.length} caractères</p>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:500,color:'#D1D5DB',marginBottom:'8px'}}>Date</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={e=>setEditDate(e.target.value)}
                          style={{
                            width:'100%',padding:'10px 12px',borderRadius:'10px',fontSize:'13px',outline:'none',
                            background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',color:'#E5E7EB',transition:'all 0.3s'
                          }}
                          onFocus={(e)=>e.currentTarget.style.borderColor='rgba(124,58,237,0.5)'}
                          onBlur={(e)=>e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}
                        />
                      </div>
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:500,color:'#D1D5DB',marginBottom:'8px'}}>Heure</label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={e=>setEditTime(e.target.value)}
                          style={{
                            width:'100%',padding:'10px 12px',borderRadius:'10px',fontSize:'13px',outline:'none',
                            background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',color:'#E5E7EB',transition:'all 0.3s'
                          }}
                          onFocus={(e)=>e.currentTarget.style.borderColor='rgba(124,58,237,0.5)'}
                          onBlur={(e)=>e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'12px',padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                    <button
                      onClick={()=>setEditingPost(null)}
                      style={{
                        padding:'8px 16px',fontSize:'13px',borderRadius:'8px',color:'#9CA3AF',
                        background:'rgba(255,255,255,0.05)',border:'none',cursor:'pointer',transition:'all 0.3s'
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      style={{
                        display:'flex',alignItems:'center',gap:'8px',padding:'8px 18px',fontSize:'13px',fontWeight:600,
                        borderRadius:'8px',background:'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                        color:'white',border:'none',cursor:'pointer',opacity:savingEdit?0.7:1,transition:'all 0.3s',
                        boxShadow:'0 4px 16px rgba(124,58,237,0.3)'
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
                  transition={{duration:0.3,ease: "easeOut"}}
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
        </motion.main>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -1000% 0; }
          100% { background-position: 1000% 0; }
        }
      `}</style>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, color, delay }: { icon: any; value: number; label: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{opacity:0,y:20}}
      animate={{opacity:1,y:0}}
      transition={{delay,duration:0.5,ease: "easeOut"}}
      whileHover={{y:-3}}
      style={{
        background:'rgba(255,255,255,0.025)',
        border:'1px solid rgba(255,255,255,0.06)',
        borderRadius:'16px',
        padding:'24px',
        position:'relative',
        overflow:'hidden',
        cursor:'default',
      }}
    >
      <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:`linear-gradient(90deg,transparent,${color},transparent)`}} />
      <div style={{position:'absolute',inset:0,background:'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.02) 50%,transparent 60%)',backgroundSize:'200%',animation:'shimmer 3s linear infinite'}} />

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'relative',zIndex:1}}>
        <div>
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            transition={{delay:delay+0.2,duration:0.6}}
            style={{
              fontSize:'36px',fontWeight:800,fontFamily:'Syne,sans-serif',letterSpacing:'-0.03em',
              lineHeight:1,background:`linear-gradient(135deg,#FFFFFF 0%,${color} 100%)`,
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'
            }}
          >
            {value}
          </motion.div>
          <div style={{fontSize:'13px',color:'#9CA3AF',marginTop:'6px',fontWeight:500}}>
            {label}
          </div>
        </div>
        <motion.div
          initial={{scale:0}}
          animate={{scale:1}}
          transition={{delay:delay+0.1,duration:0.4,type:'spring'}}
          style={{
            width:'40px',height:'40px',borderRadius:'10px',
            background:`rgba(${hexToRgb(color)},0.1)`,
            display:'flex',alignItems:'center',justifyContent:'center',
            border:`1px solid ${color}40`
          }}
        >
          <Icon style={{width:'18px',height:'18px',color}} />
        </motion.div>
      </div>
    </motion.div>
  )
}

function PostsTable({posts,currentPage,setCurrentPage,POSTS_PER_PAGE,confirmDeleteId,setConfirmDeleteId,deletingId,retryingId,handleDeletePost,handleRetryPost,setPreviewPost,openEditModal}:{posts:Post[],currentPage:number,setCurrentPage:(page:number)=>void,POSTS_PER_PAGE:number,confirmDeleteId:string|null,setConfirmDeleteId:(id:string|null)=>void,deletingId:string|null,retryingId:string|null,handleDeletePost:(id:string)=>Promise<void>,handleRetryPost:(post:Post)=>Promise<void>,setPreviewPost:(post:Post|null)=>void,openEditModal:(post:Post)=>void}) {
  const totalPages=Math.ceil(posts.length/POSTS_PER_PAGE)
  const paginated=posts.slice((currentPage-1)*POSTS_PER_PAGE,currentPage*POSTS_PER_PAGE)

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.4}} style={{borderRadius:'16px',overflow:'hidden',background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)'}}>
      <div style={{padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'16px',color:'#E5E7EB'}}>Tous les posts</h3>
        <span style={{fontSize:'12px',color:'#9CA3AF'}}>{posts.length} post{posts.length>1?'s':''} au total</span>
      </div>
      <div style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        {posts.length===0?(
          <div style={{padding:'48px 24px',textAlign:'center'}}>
            <p style={{fontSize:'16px',marginBottom:'8px',fontWeight:500,color:'#E5E7EB'}}>Aucun post pour l'instant</p>
            <p style={{fontSize:'13px',color:'#9CA3AF'}}>Clique sur "Nouveau post" ou "Importer" pour commencer !</p>
          </div>
        ):(
          <>
            {paginated.map((post)=>{
              const d=new Date(post.scheduled_at)
              const isConfirmingDelete=confirmDeleteId===post.id
              const isDeleting=deletingId===post.id
              const isRetrying=retryingId===post.id
              const statusBg={'scheduled':'rgba(124,58,237,0.1)','published':'rgba(52,211,153,0.1)','failed':'rgba(239,68,68,0.1)','draft':'rgba(255,255,255,0.05)'}[post.status]||'rgba(255,255,255,0.05)'
              const statusColor={'scheduled':'#A78BFA','published':'#34D399','failed':'#EF4444','draft':'#9CA3AF'}[post.status]||'#9CA3AF'
              const statusLabel={'scheduled':'⏰ Programmé','published':'✓ Publié','failed':'✗ Échoué','draft':'Brouillon'}[post.status]||'Brouillon'
              return (
                <motion.div key={post.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{duration:0.3}} style={{padding:'20px 24px',display:'flex',alignItems:'flex-start',gap:'16px',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'transparent',transition:'background 0.3s',cursor:'default'}} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(124,58,237,0.03)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                  <div style={{flexShrink:0,width:'56px',textAlign:'center'}}>
                    <p style={{fontSize:'18px',fontWeight:700,lineHeight:1,color:'#A78BFA',fontFamily:'Syne,sans-serif'}}>{d.getDate()}</p>
                    <p style={{fontSize:'10px',textTransform:'uppercase',marginTop:'4px',color:'#9CA3AF'}}>{d.toLocaleDateString('fr-FR',{month:'short'})}</p>
                    <p style={{fontSize:'10px',color:'#9CA3AF'}}>{d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:'13px',color:'#D1D5DB',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{post.content.replace(/<[^>]+>/g,'').slice(0,200)}</p>
                    <div style={{display:'flex',alignItems:'center',gap:'12px',marginTop:'8px'}}>
                      <span style={{fontSize:'12px',color:'#9CA3AF'}}>{post.content.replace(/<[^>]+>/g,'').length} car.</span>
                      {post.images&&post.images.length>0&&(<span style={{fontSize:'12px',color:'#A78BFA'}}>🖼 {post.images.length} image{post.images.length>1?'s':''}</span>)}
                    </div>
                  </div>
                  <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'8px'}}>
                    <span style={{fontSize:'11px',fontWeight:600,padding:'4px 12px',borderRadius:'6px',background:statusBg,color:statusColor}}>{statusLabel}</span>
                    {isConfirmingDelete?(
                      <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{fontSize:'11px',color:'#9CA3AF',marginRight:'4px'}}>Supprimer ?</span>
                        <button onClick={()=>handleDeletePost(post.id)} disabled={isDeleting} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',fontWeight:600,borderRadius:'6px',background:'#EF4444',color:'white',border:'none',cursor:'pointer',opacity:isDeleting?0.6:1,transition:'all 0.3s'}}>
                          {isDeleting?<Loader2 style={{width:'12px',height:'12px',animation:'spin 1s linear infinite'}} />:<Check style={{width:'12px',height:'12px'}} />}
                          Oui
                        </button>
                        <button onClick={()=>setConfirmDeleteId(null)} style={{padding:'4px 10px',fontSize:'11px',borderRadius:'6px',color:'#9CA3AF',background:'rgba(255,255,255,0.05)',border:'none',cursor:'pointer',transition:'all 0.3s'}}>Non</button>
                      </div>
                    ):(
                      <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <button onClick={()=>setPreviewPost(post)} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',borderRadius:'6px',color:'#A78BFA',background:'rgba(124,58,237,0.1)',border:'none',cursor:'pointer',transition:'all 0.3s'}}><Eye style={{width:'12px',height:'12px'}} />Aperçu</button>
                        {post.status!=='published'&&(<button onClick={()=>openEditModal(post)} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',borderRadius:'6px',color:'#A78BFA',background:'rgba(124,58,237,0.1)',border:'none',cursor:'pointer',transition:'all 0.3s'}}><Pencil style={{width:'12px',height:'12px'}} />Modifier</button>)}
                        {post.status==='failed'&&(<button onClick={()=>handleRetryPost(post)} disabled={isRetrying} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',fontWeight:500,borderRadius:'6px',color:'#FCD34D',background:'rgba(245,158,11,0.1)',border:'none',cursor:'pointer',opacity:isRetrying?0.6:1,transition:'all 0.3s'}}>{isRetrying?<Loader2 style={{width:'12px',height:'12px',animation:'spin 1s linear infinite'}} />:'↺'}Réessayer</button>)}
                        <button onClick={()=>setConfirmDeleteId(post.id)} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',borderRadius:'6px',color:'#EF4444',background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer',transition:'all 0.3s'}}><Trash2 style={{width:'12px',height:'12px'}} /></button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
            {totalPages>1&&(
              <div style={{padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                <span style={{fontSize:'12px',color:'#9CA3AF'}}>Page {currentPage}/{totalPages} · {posts.length} posts</span>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <button onClick={()=>setCurrentPage(Math.max(1,currentPage-1))} disabled={currentPage===1} style={{padding:'6px 12px',fontSize:'12px',fontWeight:500,borderRadius:'8px',color:'#D1D5DB',border:'1px solid rgba(255,255,255,0.1)',background:'transparent',cursor:'pointer',opacity:currentPage===1?0.4:1,transition:'all 0.3s'}}>← Précédent</button>
                  <button onClick={()=>setCurrentPage(Math.min(totalPages,currentPage+1))} disabled={currentPage===totalPages} style={{padding:'6px 12px',fontSize:'12px',fontWeight:500,borderRadius:'8px',color:'#D1D5DB',border:'1px solid rgba(255,255,255,0.1)',background:'transparent',cursor:'pointer',opacity:currentPage===totalPages?0.4:1,transition:'all 0.3s'}}>Suivant →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '124,58,237'
}


