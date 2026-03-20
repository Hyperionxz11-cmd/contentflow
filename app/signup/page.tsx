'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Zap, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#09090B' }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(124,58,237,0.12) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--text)' }}>ContentFlow</span>
        </div>

        <h1 className="mb-1" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Crée ton compte.
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--text-muted)' }}>Commence à planifier ton contenu LinkedIn dès aujourd'hui</p>

        <form onSubmit={handleSignup} className="rounded-xl p-8 space-y-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
          {error && (
            <div className="text-sm rounded-lg p-3" style={{ background: 'var(--danger-dim)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {[
            { label: 'Nom complet', type: 'text', value: name, onChange: setName, placeholder: 'Jean Dupont' },
            { label: 'Email', type: 'email', value: email, onChange: setEmail, placeholder: 'ton@email.com' },
            { label: 'Mot de passe', type: 'password', value: password, onChange: setPassword, placeholder: '••••••••' },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{field.label}</label>
              <input
                type={field.type}
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                required
                className="w-full px-4 py-3 text-sm rounded-lg outline-none transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent-bright)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          ))}

          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg text-sm font-semibold transition-all mt-2" style={{ background: loading ? 'var(--accent-dim)' : 'var(--accent)', color: 'white', boxShadow: loading ? 'none' : '0 0 20px rgba(124,58,237,0.3)', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Création…' : 'Créer mon compte →'}
          </button>

          <p className="text-center text-sm pt-2" style={{ color: 'var(--text-muted)' }}>
            Déjà un compte ?{' '}
            <Link href="/login" className="font-medium" style={{ color: 'var(--accent-text)' }}>Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
