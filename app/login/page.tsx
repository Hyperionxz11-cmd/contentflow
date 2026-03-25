'use client'


import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'


export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const plan = new URLSearchParams(window.location.search).get('plan')
      if (plan && (plan === 'pro' || plan === 'agence') && data.user) {
        try {
          const res = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id, plan }),
          })
          const json = await res.json()
          if (json.url) {
            window.location.href = json.url
            return
          }
        } catch {}
      }
      router.push('/dashboard')
    }
  }


  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F3F2EF',
        display: 'flex',
