'use client'

import {
  Calendar, Upload, Zap, ArrowRight, Check, Play,
  Star, Sparkles, Shield, BarChart3, Linkedin,
} from 'lucide-react'
import Link from 'next/link'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'

// ── Design tokens LinkedIn ────────────────────────────────────
const LI = {
  bg:        '#F3F2EF',
  white:     '#FFFFFF',
  border:    'rgba(0,0,0,0.08)',
  blue:      '#0A66C2',
  blueHover: '#004182',
  blueBg:    'rgba(10,102,194,0.08)',
  green:     '#057642',
  greenBg:   'rgba(5,118,66,0.1)',
  text:      'rgba(0,0,0,0.9)',
  text2:     'rgba(0,0,0,0.6)',
  text3:     'rgba(0,0,0,0.4)',
  amber:     '#F59E0B',
}
const FONT = "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// ── Fade-in animation helper ──────────────────────────────────
const FadeIn = ({ children, delay = 0, y = 24 }: any) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// ── Feature card ─────────────────────────────────────────────
const FeatureCard = ({ icon: Icon, title, description, delay }: any) => (
  <FadeIn delay={delay}>
    <div style={{
      background: LI.white,
      border: `1px solid ${LI.border}`,
      borderRadius: '8px',
      padding: '28px',
      height: '100%',
      boxSizing: 'border-box',
      transition: 'box-shadow 200ms',
      fontFamily: FONT,
    }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '8px',
        background: LI.blueBg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: '18px', flexShrink: 0,
      }}>
        <Icon style={{ width: '22px', height: '22px', color: LI.blue }} />
      </div>
      <h3 style={{ fontWeight: 700, fontSize: '16px', color: LI.text, margin: '0 0 10px', fontFamily: FONT }}>{title}</h3>
      <p style={{ fontSize: '14px', color: LI.text2, lineHeight: 1.6, margin: 0, fontFamily: FONT }}>{description}</p>
    </div>
  </FadeIn>
)

// ── Testimonial card ─────────────────────────────────────────
const TestimonialCard = ({ name, role, quote, delay, initials, avatarBg }: any) => (
  <FadeIn delay={delay}>
    <div style={{
      background: LI.white, border: `1px solid ${LI.border}`, borderRadius: '8px',
      padding: '24px', fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%', background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: '14px', flexShrink: 0,
        }}>{initials}</div>
        <div>
          <p style={{ fontWeight: 700, color: LI.text, fontSize: '14px', margin: 0 }}>{name}</p>
          <p style={{ fontSize: '12px', color: LI.text2, margin: 0, marginTop: '2px' }}>{role}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={13} style={{ fill: LI.amber, color: LI.amber }} />
        ))}
      </div>
      <p style={{ fontSize: '14px', color: LI.text2, lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  </FadeIn>
)

// ── Pricing card ─────────────────────────────────────────────
const PricingCard = ({ name, price, description, features, isHighlight, delay, onClick }: any) => (
  <FadeIn delay={delay}>
    <div style={{
      background: LI.white,
      border: isHighlight ? `2px solid ${LI.blue}` : `1px solid ${LI.border}`,
      borderRadius: '8px',
      padding: '32px 28px',
      position: 'relative',
      fontFamily: FONT,
      height: '100%',
      boxSizing: 'border-box',
    }}>
      {isHighlight && (
        <div style={{
          position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
          background: LI.blue, color: 'white', fontSize: '11px', fontWeight: 700,
          padding: '3px 14px', borderRadius: '9999px', letterSpacing: '0.05em',
          whiteSpace: 'nowrap', textTransform: 'uppercase',
        }}>Le plus populaire</div>
      )}
      <h3 style={{ fontWeight: 700, fontSize: '20px', color: LI.text, margin: '0 0 6px', fontFamily: FONT }}>{name}</h3>
      <p style={{ fontSize: '13px', color: LI.text2, margin: '0 0 20px', fontFamily: FONT }}>{description}</p>
      <div style={{ fontSize: '36px', fontWeight: 700, color: LI.text, margin: '0 0 20px', fontFamily: FONT }}>
        {price === '0' ? 'Gratuit' : `€${price}`}
        {price !== '0' && <span style={{ fontSize: '14px', color: LI.text3, fontWeight: 400 }}>/mois</span>}
      </div>
      <button
        onClick={onClick}
        style={{
          width: '100%', padding: '10px 20px', borderRadius: '9999px', border: 'none',
          fontWeight: 700, fontSize: '14px', cursor: 'pointer', marginBottom: '24px',
          fontFamily: FONT, transition: 'background 150ms',
          background: isHighlight ? LI.blue : 'transparent',
          color: isHighlight ? 'white' : LI.blue,
          outline: isHighlight ? 'none' : `1px solid ${LI.blue}`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = isHighlight ? LI.blueHover : LI.blueBg }}
        onMouseLeave={e => { e.currentTarget.style.background = isHighlight ? LI.blue : 'transparent' }}
      >
        {isHighlight ? 'Démarrer gratuitement' : 'En savoir plus'}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {features.map((f: string, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: LI.text2, fontFamily: FONT }}>
            <Check size={15} style={{ color: LI.green, marginTop: '2px', flexShrink: 0 }} />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  </FadeIn>
)

// ── PAGE ─────────────────────────────────────────────────────
export default function Page() {
  const router = useRouter()

  const features = [
    { icon: Calendar, title: 'Calendrier éditorial', description: 'Planifiez vos posts sur un calendrier visuel. Glissez-déposez pour réorganiser facilement.' },
    { icon: Upload, title: 'Import en masse', description: 'Importez vos contenus depuis Word. Publication automatique selon votre planning.' },
    { icon: Zap, title: 'Publication automatique', description: 'Publiez directement sur LinkedIn à l\'heure choisie. Sans besoin d\'intervention manuelle.' },
    { icon: BarChart3, title: 'Analytics détaillées', description: 'Suivi en temps réel de vos performances. Identifiez les meilleurs horaires de publication.' },
    { icon: Sparkles, title: 'Prévisualisation réaliste', description: 'Voyez exactement comment votre post s\'affichera sur LinkedIn avant publication.' },
    { icon: Shield, title: 'Sécurité & confidentialité', description: 'Hébergement européen, conformité RGPD complète. Vos données restent confidentielles.' },
  ]

  const testimonials = [
    { initials: 'SM', avatarBg: LI.blue, name: 'Sophie Martin', role: 'Coach Business · 18K abonnés', quote: 'ContentFlow a transformé ma stratégie LinkedIn. J\'ai doublé mon engagement en 3 mois et économisé 5h par semaine.', delay: 0 },
    { initials: 'TR', avatarBg: '#057642', name: 'Thomas Renard', role: 'Fondateur SaaS · 9K abonnés', quote: 'La prévisualisation est bluffante. Je planifie tout mon contenu du mois en 2h le dimanche.', delay: 0.08 },
    { initials: 'CD', avatarBg: '#B45309', name: 'Camille Dupont', role: 'Consultante RH · 12K abonnés', quote: 'Les templates m\'ont sauvé. Je n\'avais plus de blocage créatif, résultat : 3x plus de leads.', delay: 0.16 },
  ]

  const plans = [
    {
      name: 'Gratuit',
      price: '0',
      description: 'Pour découvrir ContentFlow',
      isHighlight: false,
      features: ['3 posts par mois', 'Calendrier visuel', '1 compte LinkedIn', 'Aperçu LinkedIn'],
      delay: 0,
    },
    {
      name: 'Pro',
      price: '19',
      description: 'Pour les créateurs LinkedIn sérieux',
      isHighlight: true,
      features: ['Posts illimités', 'Import DOCX en masse', 'Analytics avancées', 'Publication automatique', 'Support prioritaire', '1 compte LinkedIn'],
      delay: 0.08,
    },
    {
      name: 'Agence',
      price: '59',
      description: 'Pour les équipes et agences',
      isHighlight: false,
      features: ['Tout du plan Pro', '5 comptes LinkedIn', 'Collaboration équipe', 'Tableau de bord unifié', 'API access', 'Onboarding dédié'],
      delay: 0.16,
    },
  ]

  return (
    <div style={{ background: LI.bg, color: LI.text, fontFamily: FONT, minHeight: '100vh' }}>

      {/* ── NAVBAR ─────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: LI.white, borderBottom: `1px solid ${LI.border}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: LI.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap style={{ width: '16px', height: '16px', color: 'white' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '17px', color: LI.text, letterSpacing: '-0.01em' }}>ContentFlow</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <Link href='#features' style={{ color: LI.text2, textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Fonctionnalités</Link>
              <Link href='#pricing' style={{ color: LI.text2, textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Tarifs</Link>
            </div>
            <button
              onClick={() => router.push('/login')}
              style={{ padding: '7px 18px', borderRadius: '9999px', border: `1px solid ${LI.blue}`, background: 'transparent', color: LI.blue, fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: FONT, transition: 'background 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = LI.blueBg }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              Connexion
            </button>
            <button
              onClick={() => router.push('/login')}
              style={{ padding: '7px 18px', borderRadius: '9999px', border: 'none', background: LI.blue, color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: FONT, transition: 'background 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = LI.blueHover }}
              onMouseLeave={e => { e.currentTarget.style.background = LI.blue }}
            >
              Commencer
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────── */}
      <section style={{ background: LI.white, borderBottom: `1px solid ${LI.border}` }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 32px 72px', textAlign: 'center' }}>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 14px', borderRadius: '9999px', background: LI.blueBg, border: `1px solid rgba(10,102,194,0.2)`, color: LI.blue, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '28px' }}
          >
            <Linkedin size={13} />
            Scheduling professionnel
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontWeight: 700, fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.05, letterSpacing: '-0.03em', color: LI.text, maxWidth: '800px', margin: '0 auto 24px', fontFamily: FONT }}
          >
            Publiez sur LinkedIn{' '}
            <span style={{ color: LI.blue }}>sans effort.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            style={{ fontSize: '18px', fontWeight: 400, color: LI.text2, maxWidth: '560px', margin: '0 auto 36px', lineHeight: 1.6, fontFamily: FONT }}
          >
            Planifiez vos contenus LinkedIn en quelques clics. Calendrier visuel, publication automatique et analytics en temps réel.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '44px' }}
          >
            <button
              onClick={() => router.push('/login')}
              style={{ padding: '12px 28px', borderRadius: '9999px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', background: LI.blue, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: FONT, boxShadow: '0 4px 16px rgba(10,102,194,0.3)', transition: 'background 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = LI.blueHover }}
              onMouseLeave={e => { e.currentTarget.style.background = LI.blue }}
            >
              Commencer gratuitement <ArrowRight size={16} />
            </button>
            <button
              onClick={() => router.push('/login')}
              style={{ padding: '12px 28px', borderRadius: '9999px', border: `1px solid ${LI.border}`, fontWeight: 700, fontSize: '15px', cursor: 'pointer', background: LI.white, color: LI.text2, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: FONT, transition: 'all 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = LI.blue; e.currentTarget.style.color = LI.blue }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = LI.border; e.currentTarget.style.color = LI.text2 }}
            >
              <Play size={16} /> Voir la démo
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '24px', padding: '14px 28px', borderRadius: '8px', background: LI.bg, border: `1px solid ${LI.border}` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex' }}>
                {[LI.blue, '#057642', '#B45309', '#0A66C2'].map((c, i) => (
                  <div key={i} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: `2px solid ${LI.white}`, marginLeft: i > 0 ? '-8px' : 0 }} />
                ))}
              </div>
              <span style={{ fontSize: '13px', color: LI.text2, fontWeight: 600 }}>+5 000 créateurs actifs</span>
            </div>
            <div style={{ width: '1px', height: '20px', background: LI.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={13} style={{ fill: LI.amber, color: LI.amber }} />)}
              <span style={{ fontSize: '13px', color: LI.text2, fontWeight: 600, marginLeft: '4px' }}>4.9/5</span>
            </div>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.65 }}
            style={{ position: 'relative', maxWidth: '860px', margin: '60px auto 0' }}
          >
            <div style={{ borderRadius: '12px', background: LI.bg, border: `1px solid ${LI.border}`, padding: '20px', boxShadow: '0 12px 48px rgba(0,0,0,0.10)' }}>
              {/* Mock navbar */}
              <div style={{ background: LI.white, borderRadius: '8px 8px 0 0', padding: '12px 20px', borderBottom: `1px solid ${LI.border}`, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: LI.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap style={{ width: '12px', height: '12px', color: 'white' }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '13px', color: LI.text }}>ContentFlow</span>
                <div style={{ flex: 1 }} />
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: LI.blue }} />
              </div>
              {/* Mock calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {['L','M','M','J','V','S','D'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: LI.text3, padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d}</div>
                ))}
                {[...Array(28)].map((_, i) => (
                  <div key={i} style={{
                    aspectRatio: '1', borderRadius: '6px', padding: '6px',
                    background: [3,8,15,22].includes(i) ? LI.blueBg : LI.white,
                    border: [3,8,15,22].includes(i) ? `1px solid rgba(10,102,194,0.2)` : `1px solid ${LI.border}`,
                    display: 'flex', flexDirection: 'column', gap: '3px',
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 600, color: i === 3 ? LI.blue : LI.text3 }}>{i + 1}</span>
                    {[3,8,15].includes(i) && (
                      <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: LI.blue, opacity: 0.7 }} />
                    )}
                    {i === 22 && (
                      <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: LI.green, opacity: 0.7 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Floating badges */}
            <motion.div
              animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '-16px', right: '24px', background: LI.white, border: `1px solid ${LI.border}`, borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, color: LI.text, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}
            >
              📈 +340% engagement
            </motion.div>
            <motion.div
              animate={{ y: [4, -4, 4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', bottom: '-20px', left: '32px', background: LI.white, border: `1px solid rgba(5,118,66,0.3)`, borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, color: LI.green, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}
            >
              ✓ Auto-publication activée
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS BAND ─────────────────────────────── */}
      <section style={{ background: LI.white, borderTop: `1px solid ${LI.border}`, borderBottom: `1px solid ${LI.border}`, padding: '48px 32px', marginTop: '32px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', textAlign: 'center' }}>
          {[
            { value: '12 000+', label: 'Posts créés' },
            { value: '98%', label: 'Taux de succès' },
            { value: '5 000+', label: 'Utilisateurs' },
            { value: '2 min', label: 'Temps de setup' },
          ].map((s, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div>
                <p style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: LI.blue, margin: '0 0 6px', letterSpacing: '-0.02em', fontFamily: FONT }}>{s.value}</p>
                <p style={{ fontSize: '13px', color: LI.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontFamily: FONT }}>{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────── */}
      <section id='features' style={{ padding: '72px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <FadeIn>
            <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '9999px', background: LI.blueBg, color: LI.blue, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px', fontFamily: FONT }}>
              Fonctionnalités
            </span>
            <h2 style={{ fontWeight: 700, fontSize: 'clamp(28px, 3.5vw, 44px)', color: LI.text, letterSpacing: '-0.025em', lineHeight: 1.15, margin: 0, fontFamily: FONT }}>
              Tout ce dont vous avez{' '}
              <span style={{ color: LI.blue }}>besoin</span>
            </h2>
          </FadeIn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {features.map((f, i) => (
            <FeatureCard key={i} {...f} delay={i * 0.07} />
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────── */}
      <section style={{ background: LI.white, borderTop: `1px solid ${LI.border}`, borderBottom: `1px solid ${LI.border}`, padding: '72px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <FadeIn>
              <h2 style={{ fontWeight: 700, fontSize: 'clamp(26px, 3vw, 40px)', color: LI.text, margin: 0, letterSpacing: '-0.025em', fontFamily: FONT }}>
                Ce que les utilisateurs en disent
              </h2>
            </FadeIn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {testimonials.map((t, i) => <TestimonialCard key={i} {...t} />)}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────── */}
      <section id='pricing' style={{ padding: '72px 32px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <FadeIn>
            <h2 style={{ fontWeight: 700, fontSize: 'clamp(26px, 3vw, 40px)', color: LI.text, margin: '0 0 12px', letterSpacing: '-0.025em', fontFamily: FONT }}>
              Tarifs simples et transparents
            </h2>
            <p style={{ fontSize: '15px', color: LI.text2, margin: 0, fontFamily: FONT }}>
              Aucune carte de crédit requise. Commencez gratuitement.
            </p>
          </FadeIn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {plans.map((plan, i) => (
            <PricingCard key={i} {...plan} onClick={() => router.push('/login')} />
          ))}
        </div>
      </section>

      {/* ── CTA BAND ───────────────────────────────── */}
      <section style={{ background: LI.blue, padding: '64px 32px', textAlign: 'center' }}>
        <FadeIn>
          <h2 style={{ fontWeight: 700, fontSize: 'clamp(24px, 3vw, 38px)', color: 'white', margin: '0 0 12px', letterSpacing: '-0.02em', fontFamily: FONT }}>
            Prêt à transformer votre LinkedIn ?
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.75)', margin: '0 0 28px', fontFamily: FONT }}>
            Rejoignez 5000+ créateurs qui publient smarter avec ContentFlow.
          </p>
          <button
            onClick={() => router.push('/login')}
            style={{ padding: '12px 32px', borderRadius: '9999px', border: 'none', background: 'white', color: LI.blue, fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: FONT, transition: 'opacity 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.92' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            Commencer gratuitement
          </button>
        </FadeIn>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer style={{ background: LI.white, borderTop: `1px solid ${LI.border}`, padding: '32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: LI.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap style={{ width: '12px', height: '12px', color: 'white' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '14px', color: LI.text, fontFamily: FONT }}>ContentFlow</span>
            <span style={{ fontSize: '13px', color: LI.text3, fontFamily: FONT, marginLeft: '8px' }}>Publiez sur LinkedIn. Libérez votre productivité.</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link href='#' style={{ fontSize: '13px', color: LI.text3, textDecoration: 'none', fontFamily: FONT }}>Conditions</Link>
            <Link href='#' style={{ fontSize: '13px', color: LI.text3, textDecoration: 'none', fontFamily: FONT }}>Confidentialité</Link>
            <Link href='#' style={{ fontSize: '13px', color: LI.text3, textDecoration: 'none', fontFamily: FONT }}>Contact</Link>
            <span style={{ fontSize: '13px', color: LI.text3, fontFamily: FONT }}>© 2026 ContentFlow</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
