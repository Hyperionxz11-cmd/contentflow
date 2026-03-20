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
  const [focusedField, setFocusedField] = useState<string | null>(null)
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

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
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

  const fields = [
    { label: 'Nom complet', type: 'text', value: name, onChange: setName, placeholder: 'Jean Dupont', key: 'name' },
    { label: 'Email', type: 'email', value: email, onChange: setEmail, placeholder: 'ton@email.com', key: 'email' },
    { label: 'Mot de passe', type: 'password', value: password, onChange: setPassword, placeholder: '••••••••', key: 'password' },
  ]

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
            {/* Orb 1 - Violet dominant */}
            <motion.div
              className="absolute rounded-full blur-[80px]"
              style={{
                width: '520px',
                height: '520px',
                background: 'radial-gradient(circle, rgba(168,85,247,0.7) 0%, rgba(139,92,246,0.2) 40%, transparent 70%)',
                top: '-200px',
                left: '-100px',
              }}
              animate={{
                x: [0, 120, -60, 0],
                y: [0, 180, 60, 0],
              }}
              transition={{
                duration: 22,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Orb 2 - Purple */}
            <motion.div
              className="absolute rounded-full blur-[80px]"
              style={{
                width: '450px',
                height: '450px',
                background: 'radial-gradient(circle, rgba(124,58,237,0.5) 0%, rgba(109,40,217,0.15) 50%, transparent 70%)',
                bottom: '-150px',
                right: '5%',
              }}
              animate={{
                x: [0, -120, 60, 0],
                y: [0, -140, -60, 0],
              }}
              transition={{
                duration: 24,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1,
              }}
            />

            {/* Orb 3 - Indigo accent */}
            <motion.div
              className="absolute rounded-full blur-[80px]"
              style={{
                width: '380px',
                height: '380px',
                background: 'radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(67,56,202,0.1) 50%, transparent 70%)',
                top: '30%',
                right: '15%',
              }}
              animate={{
                x: [0, 80, -100, 0],
                y: [0, -100, 100, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 2,
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
              className="mb-8"
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(32px, 5vw, 52px)',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: '#F0F0FF',
                maxWidth: '500px',
              }}
              variants={itemVariants}
              initial="hidden"
              animate="show"
            >
              Rejoignez{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #C4B5FD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                5,000+ créateurs
              </span>
              .
            </motion.h2>

            <motion.p
              style={{
                fontSize: '16px',
                color: 'rgba(240,240,255,0.7)',
                lineHeight: 1.6,
                maxWidth: '450px',
              }}
              variants={itemVariants}
              initial="hidden"
              animate="show"
            >
              Automatisez votre présence LinkedIn et doubllez votre engagement en quelques minutes. Pas de code requis.
            </motion.p>
          </div>

          {/* Features */}
          <motion.div
            className="relative z-10 space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Feature 1 */}
            <motion.div
              className="flex items-center gap-3"
              variants={itemVariants}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                }}
              >
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>✓</span>
              </div>
              <span style={{ color: '#F0F0FF', fontSize: '14px' }}>
                Planification intelligent du contenu
              </span>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              className="flex items-center gap-3"
              variants={itemVariants}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                }}
              >
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>✓</span>
              </div>
              <span style={{ color: '#F0F0FF', fontSize: '14px' }}>
                Analyse en temps réel & insights
              </span>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              className="flex items-center gap-3"
              variants={itemVariants}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                }}
              >
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>✓</span>
              </div>
              <span style={{ color: '#F0F0FF', fontSize: '14px' }}>
                Support 24/7 & onboarding gratuit
              </span>
            </motion.div>

            {/* Social proof card */}
            <motion.div
              className="mt-8 p-4 rounded-xl backdrop-blur-md border"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(124, 58, 237, 0.2)',
              }}
              variants={itemVariants}
              animate={floatVariants.animate}
              initial={floatVariants.initial}
            >
              <div className="flex items-center gap-2 mb-2">
                <div style={{ fontSize: '18px' }}>⭐⭐⭐⭐⭐</div>
                <span style={{ fontSize: '12px', color: 'rgba(240,240,255,0.6)' }}>4.9/5 étoiles</span>
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: '#F0F0FF',
                  lineHeight: 1.5,
                }}
              >
                "Le meilleur outil pour la croissance LinkedIn."
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
              Crée ton{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #C4B5FD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                compte.
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
              Commence à planifier ton contenu LinkedIn dès aujourd'hui
            </motion.p>

            {/* Form */}
            <motion.form
              onSubmit={handleSignup}
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

              {/* Input fields */}
              {fields.map((field, idx) => (
                <motion.div
                  key={field.key}
                  className="relative"
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                >
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    onFocus={() => setFocusedField(field.key)}
                    onBlur={() => setFocusedField(null)}
                    placeholder=""
                    required
                    className="w-full px-4 text-sm rounded-lg outline-none transition-all"
                    style={{
                      paddingTop: field.value ? '22px' : '14px',
                      paddingBottom: field.value ? '6px' : '14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: focusedField === field.key ? '1.5px solid #7C3AED' : '1.5px solid rgba(124, 58, 237, 0.2)',
                      color: '#F0F0FF',
                      boxShadow: focusedField === field.key ? '0 0 20px rgba(124, 58, 237, 0.2), inset 0 0 0 1px rgba(124, 58, 237, 0.3)' : 'none',
                    }}
                  />
                  <label
                    style={{
                      position: 'absolute',
                      left: '16px',
                      fontSize: focusedField === field.key || field.value ? '10px' : '14px',
                      top: focusedField === field.key || field.value ? '8px' : '50%',
                      transform: focusedField === field.key || field.value ? 'none' : 'translateY(-50%)',
                      transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                      color: focusedField === field.key ? '#A78BFA' : 'rgba(240,240,255,0.38)',
                      pointerEvents: 'none',
                      letterSpacing: '0.01em',
                      fontFamily: 'Outfit, sans-serif',
                      fontWeight: 500,
                    }}
                  >
                    {field.label}
                  </label>
                </motion.div>
              ))}

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
                  marginTop: '8px',
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
                  {loading ? 'Création…' : 'Créer mon compte'}
                </span>
              </motion.button>

              {/* Login link */}
              <motion.p
                className="text-center text-sm pt-2"
                style={{ color: 'rgba(240,240,255,0.38)' }}
                variants={itemVariants}
                initial="hidden"
                animate="show"
              >
                Déjà un compte ?{' '}
                <Link
                  href="/login"
                  className="font-medium transition-all hover:text-white"
                  style={{ color: '#A78BFA' }}
                >
                  Se connecter
                </Link>
              </motion.p>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
