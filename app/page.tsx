'use client'

import {
  Zap, BarChart3, CalendarIcon, Upload, Eye, Shield,
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

// ──────────────────── FEATURES DATA ────────────────────

const features = [
  {
    icon: Upload,
    title: 'Import DOCX en masse',
    description: 'Importez vos posts depuis Word. Détection automatique des séparateurs et images intégrées.',
  },
  {
    icon: CalendarIcon,
    title: 'Calendrier de publication',
    description: 'Visualisez et gérez tous vos posts sur un calendrier intuitif. Drag & drop à venir.',
  },
  {
    icon: Zap,
    title: 'Publication automatique',
    description: 'Publiez directement sur LinkedIn à l\'heure choisie, sans aucune intervention manuelle.',
  },
  {
    icon: BarChart3,
    title: 'Analytics détaillées',
    description: 'Suivez vos performances en temps réel. Identifiez les créneaux horaires les plus efficaces.',
  },
  {
    icon: Eye,
    title: 'Prévisualisation réaliste',
    description: 'Voyez exactement comment votre post apparaîtra sur LinkedIn avant de le publier.',
  },
  {
    icon: Shield,
    title: 'Sécurité & RGPD',
    description: 'Hébergement européen, conformité RGPD complète. Vos données restent confidentielles.',
  },
]

const testimonials = [
  {
    quote: 'ContentFlow a transformé ma stratégie LinkedIn. Je gagne 5 heures par semaine et mes posts obtiennent 3x plus d\'engagement.',
    name: 'Marie Dupont',
    role: 'Directrice Marketing B2B',
    initials: 'MD',
    color: '#0A66C2',
  },
  {
    quote: 'L\'import en masse depuis Word est un game-changer. Plus besoin de copier-coller manuellement chaque post.',
    name: 'Thomas Lefevre',
    role: 'Content Creator',
    initials: 'TL',
    color: '#057642',
  },
  {
    quote: 'La plateforme est intuitive et le support est exceptionnel. Exactement ce qu\'il me fallait pour scaler ma présence.',
    name: 'Aisha Williams',
    role: 'Personal Branding Coach',
    initials: 'AW',
    color: '#E16B0D',
  },
]

// ──────────────────── PAGE ────────────────────

export default function Home() {
  return (
    <div style={{ background: '#F3F2EF', fontFamily: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* NAVBAR */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '0 24px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: '#0A66C2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Zap style={{ width: '16px', height: '16px', color: 'white' }} />
          </div>
          <span style={{
            fontWeight: 700,
            fontSize: '18px',
            color: '#0A66C2',
            letterSpacing: '-0.01em',
          }}>
            ContentFlow
          </span>
        </div>

        {/* Links */}
        <Link href="#features" style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'rgba(0,0,0,0.6)',
          textDecoration: 'none',
          transition: 'color 150ms ease',
        }}
        onMouseEnter={(e) => e.target.style.color = 'rgba(0,0,0,0.9)'}
        onMouseLeave={(e) => e.target.style.color = 'rgba(0,0,0,0.6)'}
        >
          Fonctionnalités
        </Link>
        <Link href="#pricing" style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'rgba(0,0,0,0.6)',
          textDecoration: 'none',
          transition: 'color 150ms ease',
        }}
        onMouseEnter={(e) => e.target.style.color = 'rgba(0,0,0,0.9)'}
        onMouseLeave={(e) => e.target.style.color = 'rgba(0,0,0,0.6)'}
        >
          Tarifs
        </Link>

        {/* CTAs */}
        <Link href="/login" style={{
          padding: '7px 20px',
          borderRadius: '9999px',
          border: '1.5px solid rgba(0,0,0,0.3)',
          color: 'rgba(0,0,0,0.6)',
          fontSize: '15px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = '#0A66C2'
          e.target.style.color = '#0A66C2'
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = 'rgba(0,0,0,0.3)'
          e.target.style.color = 'rgba(0,0,0,0.6)'
        }}
        >
          Connexion
        </Link>
        <Link href="/signup" style={{
          padding: '7px 20px',
          borderRadius: '9999px',
          background: '#0A66C2',
          color: 'white',
          fontSize: '15px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => e.target.style.background = '#004182'}
        onMouseLeave={(e) => e.target.style.background = '#0A66C2'}
        >
          Rejoindre
        </Link>
      </nav>

      {/* HERO SECTION */}
      <section style={{
        background: '#FFFFFF',
        padding: '80px 24px 96px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}>
        <motion.div style={{ maxWidth: '760px', margin: '0 auto' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            border: '1px solid rgba(10,102,194,0.3)',
            background: '#EAF0F8',
            marginBottom: '32px',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#0A66C2',
            }} />
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#0A66C2',
            }}>
              Nouveau · Publication LinkedIn automatisée
            </span>
          </div>

          {/* H1 */}
          <h1 style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontWeight: 700,
            fontSize: 'clamp(40px, 6vw, 68px)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: 'rgba(0,0,0,0.9)',
            marginBottom: '20px',
            margin: '0 auto 20px',
          }}>
            Planifiez votre présence LinkedIn,{' '}
            <span style={{ color: '#0A66C2' }}>automatiquement</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '18px',
            color: 'rgba(0,0,0,0.6)',
            lineHeight: '1.6',
            maxWidth: '540px',
            margin: '0 auto 36px',
          }}>
            Importez depuis Word, programmez vos posts et publiez automatiquement sur LinkedIn.
            Concentrez-vous sur votre message, on s'occupe du reste.
          </p>

          {/* CTA buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '40px',
          }}>
            <Link href="/signup" style={{
              padding: '13px 28px',
              borderRadius: '9999px',
              background: '#0A66C2',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 150ms ease, box-shadow 150ms ease',
              boxShadow: '0 4px 12px rgba(10,102,194,0.25)',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#004182'
              e.target.style.boxShadow = '0 8px 24px rgba(10,102,194,0.35)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#0A66C2'
              e.target.style.boxShadow = '0 4px 12px rgba(10,102,194,0.25)'
            }}
            >
              Commencer gratuitement →
            </Link>
            <Link href="#features" style={{
              padding: '12px 28px',
              borderRadius: '9999px',
              border: '1.5px solid rgba(0,0,0,0.3)',
              color: 'rgba(0,0,0,0.7)',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#0A66C2'
              e.target.style.color = '#0A66C2'
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'rgba(0,0,0,0.3)'
              e.target.style.color = 'rgba(0,0,0,0.7)'
            }}
            >
              Voir les fonctionnalités
            </Link>
          </div>

          {/* Social proof */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            {/* Stacked avatars */}
            <div style={{ display: 'flex' }}>
              {['#0A66C2', '#057642', '#E16B0D', '#CC1016', '#5F9B41'].map((color, i) => (
                <div key={i} style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: color,
                  border: '2px solid white',
                  marginLeft: i > 0 ? '-8px' : 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {['A', 'M', 'T', 'J', 'C'][i]}
                </div>
              ))}
            </div>
            <p style={{
              fontSize: '14px',
              color: 'rgba(0,0,0,0.6)',
              fontWeight: 500,
            }}>
              <strong style={{ color: 'rgba(0,0,0,0.9)' }}>5,000+</strong> créateurs LinkedIn font confiance à ContentFlow
            </p>
          </div>
        </motion.div>
      </section>

      {/* STATS BAND */}
      <section style={{
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '32px 24px',
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          textAlign: 'center',
        }}>
          {[
            { value: '12K+', label: 'Posts créés par nos utilisateurs' },
            { value: '5h', label: 'Gagnées par semaine en moyenne' },
            { value: '3x', label: 'Plus d\'engagement LinkedIn' },
          ].map((stat, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
            >
              <p style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: '36px',
                fontWeight: 700,
                color: '#0A66C2',
                lineHeight: 1,
              }}>
                {stat.value}
              </p>
              <p style={{
                fontSize: '14px',
                color: 'rgba(0,0,0,0.55)',
                marginTop: '6px',
              }}>
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" style={{
        background: '#F3F2EF',
        padding: '72px 24px',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ textAlign: 'center', marginBottom: '48px' }}
          >
            <h2 style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              color: 'rgba(0,0,0,0.9)',
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}>
              Tout ce dont vous avez besoin
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(0,0,0,0.55)',
            }}>
              Une plateforme complète pour dominer LinkedIn
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.4, ease: 'easeOut' }}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '8px',
                    padding: '24px',
                    transition: 'box-shadow 200ms ease, transform 200ms ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: '#EAF0F8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}>
                    <Icon style={{ width: '20px', height: '20px', color: '#0A66C2' }} />
                  </div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'rgba(0,0,0,0.9)',
                    marginBottom: '8px',
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(0,0,0,0.55)',
                    lineHeight: '1.6',
                  }}>
                    {feature.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{
        background: '#FFFFFF',
        padding: '72px 24px',
        borderTop: '1px solid rgba(0,0,0,0.08)',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              color: 'rgba(0,0,0,0.9)',
              textAlign: 'center',
              marginBottom: '48px',
              letterSpacing: '-0.02em',
            }}
          >
            Ce que disent nos utilisateurs
          </motion.h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {testimonials.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '8px',
                  padding: '24px',
                  transition: 'box-shadow 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Stars */}
                <div style={{ color: '#F5A623', marginBottom: '12px', fontSize: '14px' }}>★★★★★</div>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(0,0,0,0.75)',
                  lineHeight: '1.6',
                  marginBottom: '16px',
                }}>
                  "{t.quote}"
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: t.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}>
                    {t.initials}
                  </div>
                  <div>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'rgba(0,0,0,0.9)',
                      margin: 0,
                    }}>
                      {t.name}
                    </p>
                    <p style={{
                      fontSize: '12px',
                      color: 'rgba(0,0,0,0.5)',
                      margin: '4px 0 0 0',
                    }}>
                      {t.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{
        background: '#F3F2EF',
        padding: '72px 24px',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ textAlign: 'center', marginBottom: '48px' }}
          >
            <h2 style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              color: 'rgba(0,0,0,0.9)',
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}>
              Tarifs simples et transparents
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(0,0,0,0.55)',
            }}>
              Commencez gratuitement, passez à Premium quand vous êtes prêt
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            maxWidth: '900px',
            margin: '0 auto',
            gap: '16px',
          }}>
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '8px',
                padding: '28px',
              }}
            >
              <p style={{
                fontWeight: 700,
                fontSize: '18px',
                color: 'rgba(0,0,0,0.9)',
                marginBottom: '12px',
              }}>
                Gratuit
              </p>
              <p style={{
                fontSize: '32px',
                fontWeight: 800,
                color: 'rgba(0,0,0,0.9)',
                margin: '12px 0',
              }}>
                0€<span style={{
                  fontSize: '16px',
                  fontWeight: 400,
                  color: 'rgba(0,0,0,0.5)',
                }}>/mois</span>
              </p>
              <ul style={{
                listStyle: 'none',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: 0,
              }}>
                {['5 posts/mois', 'Calendrier basique', '1 compte LinkedIn'].map((f) => (
                  <li key={f} style={{
                    fontSize: '14px',
                    color: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}>
                    <span style={{ color: '#057642', fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                borderRadius: '9999px',
                border: '1.5px solid #0A66C2',
                color: '#0A66C2',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#EAF0F8'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
              }}
              >
                Commencer
              </Link>
            </motion.div>

            {/* Premium Plan — Highlighted */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
              style={{
                background: '#FFFFFF',
                border: '2px solid #0A66C2',
                borderRadius: '8px',
                padding: '28px',
                position: 'relative',
                boxShadow: '0 8px 24px rgba(10,102,194,0.15)',
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#0A66C2',
                color: 'white',
                padding: '3px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                Le plus populaire
              </div>
              <p style={{
                fontWeight: 700,
                fontSize: '18px',
                color: '#0A66C2',
                marginBottom: '12px',
              }}>
                Premium
              </p>
              <p style={{
                fontSize: '32px',
                fontWeight: 800,
                color: 'rgba(0,0,0,0.9)',
                margin: '12px 0',
              }}>
                29€<span style={{
                  fontSize: '16px',
                  fontWeight: 400,
                  color: 'rgba(0,0,0,0.5)',
                }}>/mois</span>
              </p>
              <ul style={{
                listStyle: 'none',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: 0,
              }}>
                {['Posts illimités', 'Import DOCX', 'Analytics avancées', 'Support prioritaire'].map((f) => (
                  <li key={f} style={{
                    fontSize: '14px',
                    color: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}>
                    <span style={{ color: '#057642', fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                borderRadius: '9999px',
                background: '#0A66C2',
                color: 'white',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => e.target.style.background = '#004182'}
              onMouseLeave={(e) => e.target.style.background = '#0A66C2'}
              >
                Commencer
              </Link>
            </motion.div>

            {/* Team Plan */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '8px',
                padding: '28px',
              }}
            >
              <p style={{
                fontWeight: 700,
                fontSize: '18px',
                color: 'rgba(0,0,0,0.9)',
                marginBottom: '12px',
              }}>
                Équipe
              </p>
              <p style={{
                fontSize: '32px',
                fontWeight: 800,
                color: 'rgba(0,0,0,0.9)',
                margin: '12px 0',
              }}>
                79€<span style={{
                  fontSize: '16px',
                  fontWeight: 400,
                  color: 'rgba(0,0,0,0.5)',
                }}>/mois</span>
              </p>
              <ul style={{
                listStyle: 'none',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: 0,
              }}>
                {['Tout Premium', '5 comptes LinkedIn', 'Collaboration équipe', 'API access'].map((f) => (
                  <li key={f} style={{
                    fontSize: '14px',
                    color: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}>
                    <span style={{ color: '#057642', fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                borderRadius: '9999px',
                border: '1.5px solid #0A66C2',
                color: '#0A66C2',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#EAF0F8'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
              }}
              >
                Commencer
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#FFFFFF',
        borderTop: '1px solid rgba(0,0,0,0.1)',
        padding: '32px 24px',
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              background: '#0A66C2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Zap style={{ width: '14px', height: '14px', color: 'white' }} />
            </div>
            <span style={{
              fontWeight: 700,
              color: '#0A66C2',
              fontSize: '16px',
            }}>
              ContentFlow
            </span>
          </div>
          <p style={{
            fontSize: '13px',
            color: 'rgba(0,0,0,0.4)',
            margin: 0,
          }}>
            © 2025 ContentFlow · Tous droits réservés
          </p>
          <div style={{
            display: 'flex',
            gap: '20px',
          }}>
            <Link href="#" style={{
              fontSize: '13px',
              color: 'rgba(0,0,0,0.5)',
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => e.target.style.color = 'rgba(0,0,0,0.9)'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(0,0,0,0.5)'}
            >
              Confidentialité
            </Link>
            <Link href="#" style={{
              fontSize: '13px',
              color: 'rgba(0,0,0,0.5)',
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => e.target.style.color = 'rgba(0,0,0,0.9)'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(0,0,0,0.5)'}
            >
              CGU
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
