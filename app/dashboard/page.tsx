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

// ── LinkedIn design tokens ──────────────────────────────
const LI = {
  bg:          '#F3F2EF',
  white:       '#FFFFFF',
  border:      'rgba(0,0,0,0.08)',
  blue:        '#0A66C2',
  blueHover:   '#004182',
  blueBg:      'rgba(10,102,194,0.08)',
  blueBgHover: 'rgba(10,102,194,0.14)',
  green:       '#057642',
  greenBg:     'rgba(5,118,66,0.1)',
  red:         '#CC1016',
  redBg:       'rgba(204,16,22,0.1)',
  amber:       '#B45309',
  amberBg:     'rgba(180,83,9,0.1)',
  text:        'rgba(0,0,0,0.9)',
  text2:       'rgba(0,0,0,0.6)',
  text3:       'rgba(0,0,0,0.4)',
  shadow:      '0 1px 3px rgba(0,0,0,0.08)',
  shadowMd:    '0 4px 12px rgba(0,0,0,0.10)',
}
const FONT = "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

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
    if (profile && profile.plan === 'free') {
      const thisMonthPosts = posts.filter(p => {
        const d = new Date(p.scheduled_at)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      if (thisMonthPosts.length >= FREE_PLAN_LIMIT) {
        alert(`Plan gratuit : ${FREE_PLAN_LIMIT} posts par mois maximum. Passez en Premium pour des posts illimités.`)
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

  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const firstName = profile?.full_name?.split(' ')[0] || profile?.linkedin_name?.split(' ')[0] || 'André'
  const avatarInitial = (profile?.linkedin_name || profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()

  // ── NAV ITEMS ──
  const navItems = [
    { id: 'calendar' as const, icon: CalendarIcon, label: 'Calendrier' },
    { id: 'posts'    as const, icon: LayoutGrid,   label: 'Mes posts' },
    { id: 'analytics'as const, icon: BarChart3,    label: 'Analytics' },
  ]

  if (loading) {
    return (
      <div style={{minHeight:'100vh',background:LI.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
          <div style={{position:'relative',width:'48px',height:'48px'}}>
            <div style={{position:'absolute',inset:0,borderRadius:'50%',border:`2px solid ${LI.border}`}} />
            <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'2px solid transparent',borderTopColor:LI.blue,animation:'spin 0.8s linear infinite'}} />
            <div style={{position:'absolute',inset:'10px',borderRadius:'50%',background:LI.blueBg,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Zap style={{width:'14px',height:'14px',color:LI.blue}} />
            </div>
          </div>
          <p style={{fontSize:'14px',fontWeight:600,color:LI.text2}}>Chargement…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:LI.bg,fontFamily:FONT}}>

      {/* ── TOP NAVBAR ─────────────────────────────────── */}
      <div style={{
        position:'fixed',top:0,left:0,right:0,height:'52px',
        background:LI.white,borderBottom:`1px solid ${LI.border}`,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0 20px 0 16px',zIndex:50,
        boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <div style={{width:'32px',height:'32px',borderRadius:'6px',background:LI.blue,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Zap style={{width:'16px',height:'16px',color:'#FFFFFF'}} />
          </div>
          <span style={{fontWeight:700,fontSize:'16px',color:LI.text,letterSpacing:'-0.01em'}}>ContentFlow</span>
        </div>

        {/* Right side */}
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'12px',color:LI.text3,display:'none'}}>{capitalizedDate}</span>

          {/* Avatar navbar */}
          {profile?.linkedin_picture_url ? (
            <img
              src={profile.linkedin_picture_url}
              alt="Photo LinkedIn"
              style={{width:'32px',height:'32px',borderRadius:'50%',objectFit:'cover',border:`2px solid ${LI.blue}`,flexShrink:0}}
            />
          ) : (
            <div style={{width:'32px',height:'32px',borderRadius:'50%',background:LI.blue,display:'flex',alignItems:'center',justifyContent:'center',color:'#FFFFFF',fontWeight:700,fontSize:'13px',flexShrink:0}}>
              {avatarInitial}
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 12px',borderRadius:'9999px',border:`1px solid ${LI.border}`,background:'transparent',color:LI.text2,fontSize:'13px',fontWeight:600,cursor:'pointer',transition:'all 140ms'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,0,0,0.04)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}
          >
            <LogOut style={{width:'14px',height:'14px'}} />
            Déconnexion
          </button>
        </div>
      </div>

      {/* ── LAYOUT ─────────────────────────────────────── */}
      <div style={{display:'flex',paddingTop:'52px',minHeight:'calc(100vh - 52px)'}}>

        {/* ── LEFT SIDEBAR ─────────────────────────────── */}
        <aside style={{
          position:'fixed',left:0,top:'52px',
          width:'280px',height:'calc(100vh - 52px)',
          background:LI.white,borderRight:`1px solid ${LI.border}`,
          display:'flex',flexDirection:'column',
          overflowY:'auto',zIndex:30,
          boxShadow:'1px 0 3px rgba(0,0,0,0.04)',
        }}>
          {/* Profile card */}
          <div style={{borderBottom:`1px solid ${LI.border}`,overflow:'hidden'}}>
            {/* Blue banner */}
            <div style={{height:'52px',background:`linear-gradient(135deg, ${LI.blue} 0%, ${LI.blueHover} 100%)`}} />
            {/* Avatar */}
            <div style={{padding:'0 20px 16px',position:'relative'}}>
              <div style={{marginTop:'-28px',marginBottom:'10px'}}>
                {profile?.linkedin_picture_url ? (
                  <img
                    src={profile.linkedin_picture_url}
                    alt="Photo LinkedIn"
                    style={{width:'56px',height:'56px',borderRadius:'50%',border:`3px solid ${LI.white}`,objectFit:'cover',boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}
                  />
                ) : (
                  <div style={{width:'56px',height:'56px',borderRadius:'50%',background:LI.blue,border:`3px solid ${LI.white}`,display:'flex',alignItems:'center',justifyContent:'center',color:'#FFFFFF',fontWeight:700,fontSize:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
                    {avatarInitial}
                  </div>
                )}
              </div>
              <p style={{fontWeight:700,fontSize:'14px',color:LI.text,margin:0}}>{profile?.linkedin_name||profile?.full_name||user?.email||'Utilisateur'}</p>
              <p style={{fontSize:'12px',color:LI.text2,marginTop:'2px'}}>{profile?.email||user?.email}</p>
            </div>
          </div>

          {/* Nav */}
          <nav style={{padding:'12px 10px'}}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={()=>setActiveTab(item.id)}
                style={{
                  width:'100%',display:'flex',alignItems:'center',gap:'12px',
                  padding:'10px 14px',borderRadius:'6px',
                  border:'none',cursor:'pointer',textAlign:'left',
                  fontSize:'14px',fontWeight:activeTab===item.id?700:400,
                  fontFamily:FONT,transition:'all 120ms',
                  background:activeTab===item.id?LI.blueBg:'transparent',
                  color:activeTab===item.id?LI.blue:LI.text2,
                  marginBottom:'2px',
                }}
                onMouseEnter={e=>{if(activeTab!==item.id)e.currentTarget.style.background='rgba(0,0,0,0.04)'}}
                onMouseLeave={e=>{if(activeTab!==item.id)e.currentTarget.style.background='transparent'}}
              >
                <item.icon style={{width:'18px',height:'18px',flexShrink:0}} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* LinkedIn connection */}
          <div style={{padding:'10px 16px'}}>
            <div style={{background:LI.bg,border:`1px solid ${LI.border}`,borderRadius:'8px',padding:'14px'}}>
              {profile?.linkedin_connected ? (
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                    {profile.linkedin_picture_url ? (
                      <img src={profile.linkedin_picture_url} alt="LinkedIn" style={{width:'32px',height:'32px',borderRadius:'50%',objectFit:'cover',border:`2px solid ${LI.green}`,flexShrink:0}} />
                    ) : (
                      <div style={{width:'32px',height:'32px',borderRadius:'50%',background:LI.blue,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,color:'white',flexShrink:0}}>
                        {avatarInitial}
                      </div>
                    )}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:LI.green}} />
                        <span style={{fontSize:'10px',fontWeight:700,color:LI.green,textTransform:'uppercase',letterSpacing:'0.05em'}}>Connecté</span>
                      </div>
                      <p style={{fontSize:'12px',color:LI.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',margin:0,fontWeight:600}}>
                        {profile.linkedin_name||profile.full_name||'Compte vérifié'}
                      </p>
                    </div>
                    <button onClick={handleDisconnectLinkedIn} style={{fontSize:'10px',color:LI.red,background:'none',border:'none',cursor:'pointer',flexShrink:0,padding:'2px 4px'}}>
                      Déco
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{fontSize:'12px',color:LI.text2,marginBottom:'10px',margin:'0 0 10px'}}>Connecte LinkedIn pour publier</p>
                  <button
                    onClick={handleConnectLinkedIn}
                    style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'8px 12px',borderRadius:'9999px',fontSize:'13px',fontWeight:700,background:LI.blue,color:'white',border:'none',cursor:'pointer',transition:'background 140ms'}}
                    onMouseEnter={e=>{e.currentTarget.style.background=LI.blueHover}}
                    onMouseLeave={e=>{e.currentTarget.style.background=LI.blue}}
                  >
                    <Linkedin style={{width:'14px',height:'14px'}} />
                    Connecter LinkedIn
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Plan */}
          <div style={{padding:'0 16px 16px'}}>
            <div style={{background:LI.bg,border:`1px solid ${LI.border}`,borderRadius:'8px',padding:'14px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                <span style={{fontSize:'12px',color:LI.text2}}>Plan actuel</span>
                <span style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:LI.blue,background:LI.blueBg,padding:'2px 8px',borderRadius:'9999px'}}>
                  {profile?.plan||'Free'}
                </span>
              </div>
              {(!profile||profile.plan==='free')&&(
                <button
                  onClick={()=>router.push('/pricing')}
                  style={{width:'100%',padding:'7px 12px',borderRadius:'9999px',fontSize:'12px',fontWeight:700,border:`1px solid ${LI.blue}`,color:LI.blue,background:'transparent',cursor:'pointer',transition:'background 140ms'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=LI.blueBg}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}
                >
                  Passer en Premium ↗
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────── */}
        <main style={{marginLeft:'280px',padding:'28px 28px 28px 32px',flex:1,minHeight:'calc(100vh - 52px)'}}>

          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px',paddingBottom:'20px',borderBottom:`1px solid ${LI.border}`}}>
            <div>
              <p style={{fontSize:'12px',color:LI.text3,textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600,margin:'0 0 4px'}}>
                {capitalizedDate}
              </p>
              <h1 style={{fontWeight:700,fontSize:'24px',letterSpacing:'-0.02em',color:LI.text,margin:0}}>
                Bonjour, <span style={{color:LI.blue}}>{firstName}</span> 👋
              </h1>
            </div>

            <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
              {['premium','team','agency'].includes(profile?.plan||'') && (
                <button
                  onClick={()=>setShowCarousel(true)}
                  style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 16px',borderRadius:'9999px',fontSize:'13px',fontWeight:700,border:`1px solid ${LI.border}`,color:LI.text2,background:LI.white,cursor:'pointer',transition:'all 140ms'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=LI.blue;e.currentTarget.style.color=LI.blue}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=LI.border;e.currentTarget.style.color=LI.text2}}
                >
                  <Layers style={{width:'15px',height:'15px'}} />
                  Carousel
                </button>
              )}
              <button
                onClick={()=>setShowBulkImport(true)}
                style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 16px',borderRadius:'9999px',fontSize:'13px',fontWeight:700,border:`1px solid ${LI.border}`,color:LI.text2,background:LI.white,cursor:'pointer',transition:'all 140ms'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=LI.blue;e.currentTarget.style.color=LI.blue}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=LI.border;e.currentTarget.style.color=LI.text2}}
              >
                <Upload style={{width:'15px',height:'15px'}} />
                Importer DOCX
              </button>
              <button
                onClick={()=>{setSelectedDate(new Date().toISOString().split('T')[0]);setShowEditor(true)}}
                style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 20px',borderRadius:'9999px',fontSize:'13px',fontWeight:700,background:LI.blue,color:'#FFFFFF',border:'none',cursor:'pointer',boxShadow:'0 2px 8px rgba(10,102,194,0.3)',transition:'background 140ms'}}
                onMouseEnter={e=>{e.currentTarget.style.background=LI.blueHover}}
                onMouseLeave={e=>{e.currentTarget.style.background=LI.blue}}
              >
                <Plus style={{width:'15px',height:'15px'}} />
                Nouveau post
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:'14px',marginBottom:'24px'}}>
            {[
              {icon:FileText,     value:totalCount,     label:'Posts créés',      color:LI.blue,  bg:LI.blueBg},
              {icon:Clock,        value:scheduledCount, label:'Posts programmés',  color:LI.blue,  bg:LI.blueBg},
              {icon:CheckCircle2, value:publishedCount, label:'Publiés',          color:LI.green, bg:LI.greenBg},
            ].map((stat,idx)=>(
              <div
                key={idx}
                style={{
                  background:LI.white,
                  border:`1px solid ${LI.border}`,
                  borderRadius:'8px',
                  padding:'18px 20px',
                  display:'flex',alignItems:'center',gap:'14px',
                  boxShadow:LI.shadow,
                }}
              >
                <div style={{width:'42px',height:'42px',borderRadius:'8px',background:stat.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <stat.icon style={{width:'20px',height:'20px',color:stat.color}} />
                </div>
                <div>
                  <p style={{fontSize:'28px',fontWeight:700,color:LI.text,margin:0,lineHeight:1}}>{stat.value}</p>
                  <p style={{fontSize:'13px',color:LI.text2,margin:'4px 0 0'}}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab==='calendar'&&(
              <motion.div key="calendar" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
                <CalendarView
                  posts={posts}
                  onDayClick={handleDayClick}
                  onPostClick={(post)=>setPreviewPost(post as Post)}
                  onPostReschedule={handleReschedule}
                />
              </motion.div>
            )}

            {activeTab==='posts'&&(
              <motion.div key="posts" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
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
              <motion.div key="analytics" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
                <Analytics
                  posts={posts}
                  isPremium={['premium', 'team', 'agency'].includes(profile?.plan || '')}
                  onUpgrade={() => router.push('/pricing')}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MODALS ─────────────────────────────────── */}

          {/* LinkedIn Preview */}
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

          {/* BulkImport */}
          <AnimatePresence>
            {showBulkImport&&(
              <BulkImport
                onImport={handleBulkImport}
                onClose={()=>setShowBulkImport(false)}
                isPremium={['premium', 'team', 'agency'].includes(profile?.plan || '')}
                publishedPosts={posts.map(p => ({ scheduled_at: p.scheduled_at, status: p.status }))}
                authorAvatar={profile?.linkedin_picture_url}
                authorName={profile?.linkedin_name||profile?.full_name}
              />
            )}
          </AnimatePresence>

          {/* CarouselBuilder */}
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

          {/* Edit Modal */}
          <AnimatePresence>
            {editingPost&&(
              <motion.div
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
                onClick={()=>setEditingPost(null)}
                style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
              >
                <motion.div
                  initial={{opacity:0,scale:0.96,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96,y:16}} transition={{duration:0.25}}
                  onClick={e=>e.stopPropagation()}
                  style={{borderRadius:'12px',width:'100%',maxWidth:'500px',background:LI.white,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',border:`1px solid ${LI.border}`,overflow:'hidden',fontFamily:FONT}}
                >
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:`1px solid ${LI.border}`}}>
                    <h2 style={{fontWeight:700,fontSize:'16px',color:LI.text,margin:0}}>Modifier le post</h2>
                    <button onClick={()=>setEditingPost(null)} style={{padding:'6px',borderRadius:'8px',color:LI.text3,background:'none',border:'none',cursor:'pointer'}}>
                      <X style={{width:'18px',height:'18px'}} />
                    </button>
                  </div>
                  <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:'16px'}}>
                    <div>
                      <label style={{display:'block',fontSize:'12px',fontWeight:700,color:LI.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'}}>Contenu</label>
                      <textarea
                        value={editContent}
                        onChange={e=>setEditContent(e.target.value)}
                        rows={10}
                        style={{width:'100%',padding:'12px 14px',borderRadius:'6px',fontSize:'13px',lineHeight:1.6,resize:'vertical',fontFamily:FONT,outline:'none',background:'#FFFFFF',border:`1px solid ${LI.border}`,color:LI.text,transition:'border 150ms',boxSizing:'border-box'}}
                        onFocus={e=>e.currentTarget.style.border=`2px solid ${LI.blue}`}
                        onBlur={e=>e.currentTarget.style.border=`1px solid ${LI.border}`}
                      />
                      <p style={{fontSize:'11px',marginTop:'4px',textAlign:'right',color:editContent.length>2800?LI.red:LI.text3,fontFamily:'monospace'}}>{editContent.length} / 3000</p>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
                      <div>
                        <label style={{display:'block',fontSize:'12px',fontWeight:700,color:LI.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'}}>Date</label>
                        <input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:'6px',fontSize:'13px',outline:'none',background:LI.white,border:`1px solid ${LI.border}`,color:LI.text,transition:'border 150ms',boxSizing:'border-box',fontFamily:FONT}} onFocus={e=>e.currentTarget.style.border=`2px solid ${LI.blue}`} onBlur={e=>e.currentTarget.style.border=`1px solid ${LI.border}`} />
                      </div>
                      <div>
                        <label style={{display:'block',fontSize:'12px',fontWeight:700,color:LI.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'}}>Heure</label>
                        <input type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:'6px',fontSize:'13px',outline:'none',background:LI.white,border:`1px solid ${LI.border}`,color:LI.text,transition:'border 150ms',boxSizing:'border-box',fontFamily:FONT}} onFocus={e=>e.currentTarget.style.border=`2px solid ${LI.blue}`} onBlur={e=>e.currentTarget.style.border=`1px solid ${LI.border}`} />
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'10px',padding:'14px 22px',borderTop:`1px solid ${LI.border}`}}>
                    <button onClick={()=>setEditingPost(null)} style={{padding:'8px 16px',fontSize:'13px',fontWeight:600,borderRadius:'9999px',color:LI.text2,background:'transparent',border:`1px solid ${LI.border}`,cursor:'pointer',fontFamily:FONT}}>
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 20px',fontSize:'13px',fontWeight:700,borderRadius:'9999px',background:LI.blue,color:'white',border:'none',cursor:'pointer',opacity:savingEdit?0.7:1,transition:'background 140ms',fontFamily:FONT}}
                      onMouseEnter={e=>{if(!savingEdit)e.currentTarget.style.background=LI.blueHover}}
                      onMouseLeave={e=>{e.currentTarget.style.background=LI.blue}}
                    >
                      {savingEdit?<Loader2 style={{width:'14px',height:'14px',animation:'spin 1s linear infinite'}} />:<Check style={{width:'14px',height:'14px'}} />}
                      Enregistrer
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PostEditor Modal */}
          <AnimatePresence>
            {showEditor&&(
              <motion.div
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
                onClick={()=>setShowEditor(false)}
                style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
              >
                <motion.div
                  initial={{opacity:0,scale:0.96,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96,y:16}} transition={{duration:0.25}}
                  onClick={e=>e.stopPropagation()}
                  style={{width:'100%',maxWidth:'720px',maxHeight:'90vh',overflow:'auto'}}
                >
                  <PostEditor
                    onSave={handleSavePost}
                    onClose={()=>setShowEditor(false)}
                    initialDate={selectedDate}
                    templates={defaultTemplates}
                    authorAvatar={profile?.linkedin_picture_url}
                    authorName={profile?.linkedin_name||profile?.full_name}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── PostsTable component ─────────────────────────────────
function PostsTable({posts,currentPage,setCurrentPage,POSTS_PER_PAGE,confirmDeleteId,setConfirmDeleteId,deletingId,retryingId,handleDeletePost,handleRetryPost,setPreviewPost,openEditModal}:{posts:Post[],currentPage:number,setCurrentPage:(page:number)=>void,POSTS_PER_PAGE:number,confirmDeleteId:string|null,setConfirmDeleteId:(id:string|null)=>void,deletingId:string|null,retryingId:string|null,handleDeletePost:(id:string)=>Promise<void>,handleRetryPost:(post:Post)=>Promise<void>,setPreviewPost:(post:Post|null)=>void,openEditModal:(post:Post)=>void}) {
  const FONT2 = "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  const LI2 = {
    white:'#FFFFFF',border:'rgba(0,0,0,0.08)',blue:'#0A66C2',blueBg:'rgba(10,102,194,0.08)',
    green:'#057642',greenBg:'rgba(5,118,66,0.1)',red:'#CC1016',redBg:'rgba(204,16,22,0.1)',
    amber:'#B45309',amberBg:'rgba(180,83,9,0.1)',
    text:'rgba(0,0,0,0.9)',text2:'rgba(0,0,0,0.6)',text3:'rgba(0,0,0,0.4)',
  }
  const totalPages=Math.ceil(posts.length/POSTS_PER_PAGE)
  const paginated=posts.slice((currentPage-1)*POSTS_PER_PAGE,currentPage*POSTS_PER_PAGE)

  const statusStyle: Record<string, {bg:string; color:string; label:string}> = {
    scheduled: {bg:LI2.blueBg,  color:LI2.blue,  label:'⏰ Programmé'},
    published: {bg:LI2.greenBg, color:LI2.green, label:'✓ Publié'},
    failed:    {bg:LI2.redBg,   color:LI2.red,   label:'✗ Échoué'},
    draft:     {bg:'rgba(0,0,0,0.05)', color:LI2.text3, label:'Brouillon'},
  }

  return (
    <div style={{borderRadius:'8px',overflow:'hidden',background:LI2.white,border:`1px solid ${LI2.border}`,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',fontFamily:FONT2}}>
      <div style={{padding:'18px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${LI2.border}`}}>
        <h3 style={{fontWeight:700,fontSize:'16px',color:LI2.text,margin:0}}>Tous les posts</h3>
        <span style={{fontSize:'12px',color:LI2.text3}}>{posts.length} post{posts.length>1?'s':''} au total</span>
      </div>
      <div>
        {posts.length===0?(
          <div style={{padding:'48px 24px',textAlign:'center'}}>
            <p style={{fontSize:'16px',fontWeight:600,color:LI2.text,marginBottom:'6px'}}>Aucun post pour l&apos;instant</p>
            <p style={{fontSize:'13px',color:LI2.text2}}>Clique sur &quot;Nouveau post&quot; ou &quot;Importer&quot; pour commencer !</p>
          </div>
        ):(
          <>
            {paginated.map((post)=>{
              const d=new Date(post.scheduled_at)
              const isConfirmingDelete=confirmDeleteId===post.id
              const isDeleting=deletingId===post.id
              const isRetrying=retryingId===post.id
              const ss=statusStyle[post.status]||statusStyle.draft
              return (
                <div key={post.id} style={{padding:'16px 24px',display:'flex',alignItems:'flex-start',gap:'14px',borderBottom:`1px solid ${LI2.border}`,background:'transparent',transition:'background 120ms'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{flexShrink:0,width:'52px',textAlign:'center',paddingTop:'2px'}}>
                    <p style={{fontSize:'20px',fontWeight:700,lineHeight:1,color:LI2.blue,margin:0}}>{d.getDate()}</p>
                    <p style={{fontSize:'10px',textTransform:'uppercase',marginTop:'3px',color:LI2.text3,margin:'3px 0 0'}}>{d.toLocaleDateString('fr-FR',{month:'short'})}</p>
                    <p style={{fontSize:'10px',color:LI2.text3,margin:'2px 0 0'}}>{d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:'13px',color:LI2.text,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',margin:0}}>{post.content.replace(/<[^>]+>/g,'').slice(0,200)}</p>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'6px'}}>
                      <span style={{fontSize:'12px',color:LI2.text3}}>{post.content.replace(/<[^>]+>/g,'').length} car.</span>
                      {post.images&&post.images.length>0&&<span style={{fontSize:'12px',color:LI2.blue}}>🖼 {post.images.length} image{post.images.length>1?'s':''}</span>}
                    </div>
                  </div>
                  <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'8px'}}>
                    <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'9999px',background:ss.bg,color:ss.color}}>{ss.label}</span>
                    {isConfirmingDelete?(
                      <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{fontSize:'11px',color:LI2.text3,marginRight:'4px'}}>Supprimer ?</span>
                        <button onClick={()=>handleDeletePost(post.id)} disabled={isDeleting} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',fontWeight:700,borderRadius:'6px',background:LI2.red,color:'white',border:'none',cursor:'pointer',opacity:isDeleting?0.6:1}}>
                          {isDeleting?<Loader2 style={{width:'12px',height:'12px',animation:'spin 1s linear infinite'}} />:<Check style={{width:'12px',height:'12px'}} />}Oui
                        </button>
                        <button onClick={()=>setConfirmDeleteId(null)} style={{padding:'4px 10px',fontSize:'11px',borderRadius:'6px',color:LI2.text2,background:'rgba(0,0,0,0.05)',border:'none',cursor:'pointer'}}>Non</button>
                      </div>
                    ):(
                      <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <button onClick={()=>setPreviewPost(post)} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',fontWeight:600,borderRadius:'6px',color:LI2.blue,background:LI2.blueBg,border:'none',cursor:'pointer'}}><Eye style={{width:'12px',height:'12px'}} />Aperçu</button>
                        {post.status!=='published'&&(<button onClick={()=>openEditModal(post)} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',fontWeight:600,borderRadius:'6px',color:LI2.blue,background:LI2.blueBg,border:'none',cursor:'pointer'}}><Pencil style={{width:'12px',height:'12px'}} />Modifier</button>)}
                        {post.status==='failed'&&(<button onClick={()=>handleRetryPost(post)} disabled={isRetrying} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',fontWeight:600,borderRadius:'6px',color:LI2.amber,background:LI2.amberBg,border:'none',cursor:'pointer',opacity:isRetrying?0.6:1}}>{isRetrying?<Loader2 style={{width:'12px',height:'12px',animation:'spin 1s linear infinite'}} />:'↺'}Réessayer</button>)}
                        <button onClick={()=>setConfirmDeleteId(post.id)} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'11px',fontWeight:600,borderRadius:'6px',color:LI2.red,background:LI2.redBg,border:'none',cursor:'pointer'}}><Trash2 style={{width:'12px',height:'12px'}} /></button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {totalPages>1&&(
              <div style={{padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:`1px solid ${LI2.border}`}}>
                <span style={{fontSize:'12px',color:LI2.text3}}>Page {currentPage}/{totalPages} · {posts.length} posts</span>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <button onClick={()=>setCurrentPage(Math.max(1,currentPage-1))} disabled={currentPage===1} style={{padding:'6px 12px',fontSize:'12px',fontWeight:600,borderRadius:'6px',color:LI2.text,border:`1px solid ${LI2.border}`,background:LI2.white,cursor:'pointer',opacity:currentPage===1?0.4:1,fontFamily:FONT2}}>← Précédent</button>
                  <button onClick={()=>setCurrentPage(Math.min(totalPages,currentPage+1))} disabled={currentPage===totalPages} style={{padding:'6px 12px',fontSize:'12px',fontWeight:600,borderRadius:'6px',color:LI2.text,border:`1px solid ${LI2.border}`,background:LI2.white,cursor:'pointer',opacity:currentPage===totalPages?0.4:1,fontFamily:FONT2}}>Suivant →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
