'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F3F2EF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Header with logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ textAlign: 'center', marginBottom: '32px' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#0A66C2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <span
            style={{
              fontFamily: "'Source Sans 3', sans-serif",
              fontWeight: 700,
              fontSize: '24px',
              color: 'rgba(0,0,0,0.9)',
              letterSpacing: '-0.01em',
            }}
          >
            ContentFlow
          </span>
        </div>
      </motion.div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '8px',
          padding: '40px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {/* Heading */}
        <h1
          style={{
            fontFamily: "'Source Sans 3', sans-serif",
            fontWeight: 600,
            fontSize: '28px',
            letterSpacing: '-0.01em',
            color: 'rgba(0,0,0,0.9)',
            marginBottom: '8px',
            margin: 0,
          }}
        >
          Créer un compte
        </h1>
        <p
          style={{
            fontFamily: "'Source Sans 3', sans-serif",
            fontSize: '14px',
            color: 'rgba(0,0,0,0.6)',
            marginBottom: '24px',
            margin: '0 0 24px 0',
          }}
        >
          Rejoignez des milliers de créateurs
        </p>

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: '#FDEAEA',
              border: '1px solid #FCA5A5',
              borderRadius: '4px',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#C41C3B',
              fontFamily: "'Source Sans 3', sans-serif",
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name input */}
          <div style={{ marginBottom: '8px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(0,0,0,0.7)',
                marginBottom: '4px',
                fontFamily: "'Source Sans 3', sans-serif",
              }}
            >
              Nom complet
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid rgba(0,0,0,0.35)',
                borderRadius: '4px',
                fontSize: '16px',
                fontFamily: "'Source Sans 3', sans-serif",
                color: 'rgba(0,0,0,0.9)',
                outline: 'none',
                transition: 'border 100ms ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.border = '2px solid #0A66C2')}
              onBlur={(e) => (e.currentTarget.style.border = '1px solid rgba(0,0,0,0.35)')}
            />
          </div>

          {/* Email input */}
          <div style={{ marginBottom: '8px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(0,0,0,0.7)',
                marginBottom: '4px',
                fontFamily: "'Source Sans 3', sans-serif",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid rgba(0,0,0,0.35)',
                borderRadius: '4px',
                fontSize: '16px',
                fontFamily: "'Source Sans 3', sans-serif",
                color: 'rgba(0,0,0,0.9)',
                outline: 'none',
                transition: 'border 100ms ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.border = '2px solid #0A66C2')}
              onBlur={(e) => (e.currentTarget.style.border = '1px solid rgba(0,0,0,0.35)')}
            />
          </div>

          {/* Password input */}
          <div style={{ marginBottom: '8px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(0,0,0,0.7)',
                marginBottom: '4px',
                fontFamily: "'Source Sans 3', sans-serif",
              }}
            >
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid rgba(0,0,0,0.35)',
                borderRadius: '4px',
                fontSize: '16px',
                fontFamily: "'Source Sans 3', sans-serif",
                color: 'rgba(0,0,0,0.9)',
                outline: 'none',
                transition: 'border 100ms ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.border = '2px solid #0A66C2')}
              onBlur={(e) => (e.currentTarget.style.border = '1px solid rgba(0,0,0,0.35)')}
            />
          </div>

          {/* Primary button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '9999px',
              background: loading ? '#B8DAFF' : '#0A66C2',
              color: '#FFFFFF',
              fontFamily: "'Source Sans 3', sans-serif",
              fontSize: '16px',
              fontWeight: 600,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease',
              marginTop: '8px',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#004182'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = '#0A66C2'
            }}
          >
            {loading ? 'Création…' : 'Créer un compte'}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '20px 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.15)' }} />
          <span
            style={{
              fontSize: '13px',
              color: 'rgba(0,0,0,0.5)',
              fontWeight: 500,
              fontFamily: "'Source Sans 3', sans-serif",
            }}
          >
            ou
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.15)' }} />
        </div>

        {/* Login link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '16px',
            fontSize: '14px',
            color: 'rgba(0,0,0,0.6)',
            fontFamily: "'Source Sans 3', sans-serif",
            margin: 0,
          }}
        >
          Vous avez déjà un compte ?{' '}
          <Link
            href="/login"
            style={{
              color: '#0A66C2',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
