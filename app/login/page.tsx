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
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  }

  const formVariants = {
    hidden: { opacity: 0, x: 40 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.7,
        ease: "easeOut",
        delay: 0.2,
      },
    },
  }

  const leftPanelVariants = {
    hidden: { opacity: 0, x: -40 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.7,
        ease: "easeOut",
      },
    },
  }

  const floatVariants = {
    initial: { y: 0 },
    animate: {
      y: [0, -20, 0],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  }

  const slideUpVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: '#05050A' }}>
      {/* Full-screen split layout */}
      <div className="flex h-screen">
        {/* LEFT PANEL - Hidden on mobile, 50% on lg */}
        <motion.div
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
          style={{
            background: 'linear-gradient(135deg, #0f0a1a 0%, #1a0f2e 50%, #0d0517 100%)',
          }}
          variants={leftPanelVariants}
          initial="hidden"
          animate="show"
        >
          {/* Animated gradient mesh orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Orb 1 - Purple */}
            <motion.div
              className="absolute rounded-full blur-[80px]"
              style={{
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(124,58,237,0.6) 0%, rgba(109,40,217,0.2) 40%, transparent 70%)',
                top: '-150px',
                left: '-150px',
              }}
              animate={{
                x: [0, 100, -50, 0],
                y: [0, 150, 50, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Orb 2 - Violet */}
            <motion.div
              className="absolute rounded-full blur-[80px]"
              style={{
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, rgba(139,92,246,0.1) 50%, transparent 70%)',
                bottom: '-100px',
                right: '-100px',
              }}
              animate={{
                x: [0, -100, 50, 0],
                y: [0, -100, -50, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 2,
              }}
            />

            {/* Orb 3 - Indigo */}
            <motion.div
              className="absolute rounded-full blur-[80px]"
              style={{
                width: '450px',
                height: '450px',
                background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(67,56,202,0.1) 50%, transparent 70%)',
                top: '50%',
                right: '10%',
              }}
              animate={{
                x: [0, 50, -100, 0],
                y: [0, -80, 80, 0],
              }}
              transition={{
                duration: 22,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1,
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-2 mb-12"
              variants={itemVariants}
              initial="hidden"
              animate="show"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                  boxShadow: '0 0 24px rgba(124,58,237,0.6)',
                }}
              >
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                ContentFlow
              </span>
            </motion.div>

            {/* Main headline */}
            <motion.h2
              className="mb-12"
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(28px, 5vw, 48px)',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: '#F0F0FF',
                maxWidth: '500px',
              }}
              variants={itemVariants}
              initial="hidden"
              animate="show"
            >
              Votre présence LinkedIn,{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #C4B5FD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                automatisée.
              </span>
            </motion.h2>
          </div>

          {/* Stats and testimonials section */}
          <motion.div
            className="relative z-10 space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Stat bubble 1 */}
            <motion.div
              className="inline-block px-4 py-2 rounded-full backdrop-blur-md border"
              style={{
                background: 'rgba(124, 58, 237, 0.1)',
                borderColor: 'rgba(124, 58, 237, 0.3)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#C4B5FD',
              }}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
            >
              ✨ 12,000+ posts créés
            </motion.div>

            {/* Stat bubble 2 */}
            <motion.div
              className="inline-block px-4 py-2 rounded-full backdrop-blur-md border ml-3"
              style={{
                background: 'rgba(168, 139, 250, 0.1)',
                borderColor: 'rgba(168, 139, 250, 0.3)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#A78BFA',
              }}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
            >
              🚀 Rejoin 5,000+ créateurs
            </motion.div>

            {/* Testimonial card */}
            <motion.div
              className="mt-6 p-4 rounded-xl backdrop-blur-md border"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(124, 58, 237, 0.2)',
              }}
              variants={itemVariants}
              animate={floatVariants.animate}
              initial={floatVariants.initial}
            >
              <p
                style={{
                  fontSize: '13px',
                  color: '#F0F0FF',
                  marginBottom: '8px',
                  lineHeight: 1.5,
                }}
              >
                "ContentFlow m'a permis d'augmenter mon engagement LinkedIn de 300% en 2 mois."
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(240,240,255,0.6)' }}>
                — Marie, Content Creator
              </p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* RIGHT PANEL - Full width on mobile, 50% on lg */}
        <motion.div
          className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12"
          style={{ background: '#05050A' }}
          variants={formVariants}
          initial="hidden"
          animate="show"
        >
          <div className="w-full max-w-sm">
            {/* Logo (mobile) */}
            <motion.div
              className="lg:hidden flex items-center gap-2 mb-8"
              variants={slideUpVariants}
              initial="hidden"
              animate="show"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                  boxShadow: '0 0 24px rgba(124,58,237,0.5)',
                }}
              >
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: '#F0F0FF',
                }}
              >
                ContentFlow
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              className="mb-2"
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.5vw, 40px)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: '#F0F0FF',
              }}
              variants={slideUpVariants}
              initial="hidden"
              animate="show"
            >
              Bon{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #C4B5FD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                retour.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="mb-8 text-sm"
              style={{ color: 'rgba(240,240,255,0.38)' }}
              variants={slideUpVariants}
              initial="hidden"
              animate="show"
            >
              Connecte-toi pour accéder à ton dashboard
            </motion.p>

            {/* Form */}
            <motion.form
              onSubmit={handleLogin}
              className="space-y-5"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* Error state */}
              {error && (
                <motion.div
                  className="text-sm rounded-lg p-4 border"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#FCA5A5',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                >
                  {error}
                </motion.div>
              )}

              {/* Email input with floating label */}
              <motion.div
                className="relative"
                variants={itemVariants}
                initial="hidden"
                animate="show"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder=""
                  required
                  className="w-full px-4 text-sm rounded-lg outline-none transition-all"
                  style={{
                    paddingTop: email ? '22px' : '14px',
                    paddingBottom: email ? '6px' : '14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: focusedField === 'email' ? '1.5px solid #7C3AED' : '1.5px solid rgba(124, 58, 237, 0.2)',
                    color: '#F0F0FF',
                    boxShadow: focusedField === 'email' ? '0 0 20px rgba(124, 58, 237, 0.2), inset 0 0 0 1px rgba(124, 58, 237, 0.3)' : 'none',
                  }}
                />
                <label
                  style={{
                    position: 'absolute',
                    left: '16px',
                    fontSize: focusedField === 'email' || email ? '10px' : '14px',
                    top: focusedField === 'email' || email ? '8px' : '50%',
                    transform: focusedField === 'email' || email ? 'none' : 'translateY(-50%)',
                    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: focusedField === 'email' ? '#A78BFA' : 'rgba(240,240,255,0.38)',
                    pointerEvents: 'none',
                    letterSpacing: '0.01em',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  Email
                </label>
              </motion.div>

              {/* Password input with floating label */}
              <motion.div
                className="relative"
                variants={itemVariants}
                initial="hidden"
                animate="show"
              >
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder=""
                  required
                  className="w-full px-4 text-sm rounded-lg outline-none transition-all"
                  style={{
                    paddingTop: password ? '22px' : '14px',
                    paddingBottom: password ? '6px' : '14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: focusedField === 'password' ? '1.5px solid #7C3AED' : '1.5px solid rgba(124, 58, 237, 0.2)',
                    color: '#F0F0FF',
                    boxShadow: focusedField === 'password' ? '0 0 20px rgba(124, 58, 237, 0.2), inset 0 0 0 1px rgba(124, 58, 237, 0.3)' : 'none',
                  }}
                />
                <label
                  style={{
                    position: 'absolute',
                    left: '16px',
                    fontSize: focusedField === 'password' || password ? '10px' : '14px',
                    top: focusedField === 'password' || password ? '8px' : '50%',
                    transform: focusedField === 'password' || password ? 'none' : 'translateY(-50%)',
                    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: focusedField === 'password' ? '#A78BFA' : 'rgba(240,240,255,0.38)',
                    pointerEvents: 'none',
                    letterSpacing: '0.01em',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  Mot de passe
                </label>
              </motion.div>

              {/* CTA Button */}
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold text-white relative overflow-hidden group"
                style={{
                  background: loading ? 'rgba(124, 58, 237, 0.3)' : 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '15px',
                  fontWeight: 600,
                }}
                variants={itemVariants}
                initial="hidden"
                animate="show"
                whileHover={!loading ? { scale: 1.02 } : undefined}
                whileTap={!loading ? { scale: 0.98 } : undefined}
              >
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                  }}
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                />
                <span className="relative z-10">
                  {loading ? 'Connexion…' : 'Se connecter'}
                </span>
              </motion.button>

              {/* Signup link */}
              <motion.p
                className="text-center text-sm pt-2"
                style={{ color: 'rgba(240,240,255,0.38)' }}
                variants={itemVariants}
                initial="hidden"
                animate="show"
              >
                Pas encore de compte ?{' '}
                <Link
                  href="/signup"
                  className="font-medium transition-all hover:text-white"
                  style={{ color: '#A78BFA' }}
                >
                  Créer un compte
                </Link>
              </motion.p>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
