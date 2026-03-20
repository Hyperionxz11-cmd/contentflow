'use client'

import {
  Calendar, Upload, Zap, ArrowRight, Check, Play,
  Star, Sparkles, Shield, BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

// ──────────────────── ANIMATIONS ────────────────────

const FadeInUp = ({ children, delay = 0, duration = 0.6 }) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  )
}

const FloatingOrb = ({ top, left, size, color, delay, duration = 20 }) => {
  return (
    <motion.div
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        filter: `blur(${size / 2}px)`,
        pointerEvents: 'none',
      }}
      animate={{
        y: [0, -40, 0],
        x: [0, 30, 0],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

const StatCard = ({ value, label, delay }) => (
  <FadeInUp delay={delay} duration={0.6}>
    <div style={{
      textAlign: 'center',
      padding: '32px 16px',
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(10px)',
    }}>
      <motion.div style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        fontSize: 'clamp(28px, 5vw, 42px)',
        background: 'linear-gradient(120deg, #A78BFA 0%, #7C3AED 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '8px',
      }}>
        {value}
      </motion.div>
      <p style={{
        fontSize: '13px',
        color: 'rgba(240,240,255,0.5)',
        fontWeight: 500,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        {label}
      </p>
    </div>
  </FadeInUp>
)

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <FadeInUp delay={delay}>
    <motion.div
      whileHover={{ y: -8, boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.15)' }}
      style={{
        padding: '32px',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        height: '100%',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.6), transparent)',
      }} />
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: 'rgba(124,58,237,0.12)',
        border: '1px solid rgba(124,58,237,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
      }}>
        <Icon style={{ width: '22px', height: '22px', color: '#A78BFA' }} />
      </div>
      <h3 style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 700,
        fontSize: '18px',
        marginBottom: '12px',
        color: '#F0F0FF',
      }}>
        {title}
      </h3>
      <p style={{
        color: 'rgba(240,240,255,0.4)',
        fontSize: '14px',
        lineHeight: 1.7,
      }}>
        {description}
      </p>
    </motion.div>
  </FadeInUp>
)

const TestimonialCard = ({ name, role, quote, delay, initials, avatarColor }) => (
  <FadeInUp delay={delay}>
    <motion.div
      whileHover={{ boxShadow: '0 20px 50px rgba(124,58,237,0.2), 0 0 1px 1px rgba(124,58,237,0.3)' }}
      style={{
        padding: '28px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: avatarColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontSize: '14px',
        }}>
          {initials}
        </div>
        <div>
          <p style={{
            fontWeight: 600,
            color: '#F0F0FF',
            fontSize: '14px',
            margin: 0,
          }}>
            {name}
          </p>
          <p style={{
            fontSize: '12px',
            color: 'rgba(240,240,255,0.5)',
            margin: 0,
            marginTop: '2px',
          }}>
            {role}
          </p>
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '14px',
      }}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            style={{ fill: '#FCD34D', color: '#FCD34D' }}
          />
        ))}
      </div>
      <p style={{
        fontSize: '14px',
        color: 'rgba(240,240,255,0.7)',
        lineHeight: 1.7,
        fontStyle: 'italic',
        margin: 0,
      }}>
        "{quote}"
      </p>
    </motion.div>
  </FadeInUp>
)

const PricingCard = ({ name, price, description, features, isHighlight, delay }) => (
  <FadeInUp delay={delay}>
    <motion.div
      whileHover={{ y: -4 }}
      style={{
        padding: '40px 32px',
        borderRadius: '20px',
        background: isHighlight
          ? 'rgba(124,58,237,0.1)'
          : 'rgba(255,255,255,0.025)',
        border: isHighlight
          ? '1px solid rgba(124,58,237,0.4)'
          : '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isHighlight && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.8), transparent)',
        }} />
      )}
      {isHighlight && (
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '99px',
          background: 'rgba(124,58,237,0.15)',
          border: '1px solid rgba(124,58,237,0.3)',
          color: '#A78BFA',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          Le plus populaire
        </div>
      )}
      <h3 style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        fontSize: '24px',
        color: '#F0F0FF',
        marginBottom: '8px',
        marginTop: isHighlight ? 0 : '24px',
      }}>
        {name}
      </h3>
      <p style={{
        fontSize: '13px',
        color: 'rgba(240,240,255,0.5)',
        marginBottom: '24px',
      }}>
        {description}
      </p>
      <div style={{
        fontSize: '32px',
        fontWeight: 800,
        color: '#F0F0FF',
        marginBottom: '24px',
      }}>
        {price === '0' ? 'Gratuit' : `€${price}`}
        {price !== '0' && <span style={{ fontSize: '14px', color: 'rgba(240,240,255,0.5)' }}>/mois</span>}
      </div>
      <button style={{
        width: '100%',
        padding: '12px 24px',
        borderRadius: '10px',
        border: 'none',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
        marginBottom: '32px',
        background: isHighlight
          ? 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)'
          : 'rgba(255,255,255,0.06)',
        color: isHighlight ? 'white' : '#F0F0FF',
        transition: 'all 0.3s ease',
      }}>
        {isHighlight ? 'Démarrer gratuitement' : 'En savoir plus'}
      </button>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {features.map((feature, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '13px',
            color: 'rgba(240,240,255,0.7)',
          }}>
            <Check size={16} style={{ color: '#A78BFA', marginTop: '2px', flexShrink: 0 }} />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </motion.div>
  </FadeInUp>
)

// ──────────────────── PAGE ────────────────────

export default function Page() {
  const [isNavOpen, setIsNavOpen] = useState(false)

  return (
    <div style={{
      background: '#050508',
      color: '#F0F0FF',
      fontFamily: 'Outfit, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Animated background orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <FloatingOrb
          top='-10%'
          left='-5%'
          size='700px'
          color='rgba(124,58,237,0.35)'
          delay={0}
          duration={25}
        />
        <FloatingOrb
          top='-15%'
          left='80%'
          size='600px'
          color='rgba(79,70,229,0.25)'
          delay={5}
          duration={30}
        />
        <FloatingOrb
          top='60%'
          left='40%'
          size='500px'
          color='rgba(147,51,234,0.2)'
          delay={10}
          duration={35}
        />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '16px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(5,5,8,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px' }}>
          ContentFlow
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '48px',
        }}>
          <div style={{ display: 'flex', gap: '32px', fontSize: '13px' }}>
            <Link href='#features' style={{ color: '#F0F0FF', textDecoration: 'none', opacity: 0.7 }}>
              Fonctionnalités
            </Link>
            <Link href='#pricing' style={{ color: '#F0F0FF', textDecoration: 'none', opacity: 0.7 }}>
              Tarifs
            </Link>
          </div>
          <button style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(124,58,237,0.4)',
            background: 'rgba(124,58,237,0.1)',
            color: '#A78BFA',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}>
            Connexion
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 48px 80px',
        textAlign: 'center',
      }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '99px',
            background: 'rgba(124,58,237,0.1)',
            border: '1px solid rgba(124,58,237,0.25)',
            color: '#A78BFA',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '24px',
          }}
        >
          <Sparkles size={14} />
          Scheduling professionnel
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(48px, 7vw, 96px)',
            lineHeight: 1.0,
            letterSpacing: '-0.04em',
            color: '#F0F0FF',
            maxWidth: '840px',
            marginBottom: '28px',
            margin: '0 auto 28px',
          }}
        >
          Publiez sur LinkedIn{' '}
          <span style={{
            background: 'linear-gradient(120deg, #FFFFFF 0%, #C4B5FD 30%, #A78BFA 60%, #7C3AED 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'text-shine 4s linear infinite',
          }}>
            sans effort.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            fontSize: '18px',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 300,
            color: 'rgba(240,240,255,0.6)',
            maxWidth: '600px',
            marginBottom: '40px',
            margin: '0 auto 40px',
          }}
        >
          Planifiez vos contenus LinkedIn en quelques clics. Calendrier visuel, publication automatique et analytics en temps réel.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            marginBottom: '48px',
            flexWrap: 'wrap',
          }}
        >
          <button style={{
            padding: '12px 32px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 40px rgba(124,58,237,0.4)',
          }}>
            Commencer gratuitement
            <ArrowRight size={16} />
          </button>
          <button style={{
            padding: '12px 32px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.15)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)',
            color: '#F0F0FF',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
          }}>
            <Play size={16} />
            Voir la démo
          </button>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            justifyContent: 'center',
            padding: '20px 32px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '80px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', marginRight: '-8px' }}>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, hsl(${280 + i * 20}, 100%, 50%), hsl(${300 + i * 20}, 100%, 40%))`,
                    border: '2px solid #050508',
                  }}
                />
              ))}
            </div>
            <span style={{
              fontSize: '13px',
              color: 'rgba(240,240,255,0.7)',
              fontWeight: 500,
            }}>
              +5 000 créateurs actifs
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
          }}>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                style={{ fill: '#FCD34D', color: '#FCD34D' }}
              />
            ))}
            <span style={{ color: 'rgba(240,240,255,0.7)', marginLeft: '4px' }}>
              4.9/5
            </span>
          </div>
        </motion.div>

        {/* Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '900px',
            perspective: '1200px',
          }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            style={{
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(124,58,237,0.2)',
              padding: '24px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 80px rgba(124,58,237,0.2), inset 0 0 40px rgba(255,255,255,0.05)',
            }}
          >
            <div style={{
              borderRadius: '16px',
              background: 'rgba(5,5,8,0.8)',
              padding: '32px',
              minHeight: '400px',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '12px',
            }}>
              {/* Calendar grid mockup */}
              {[...Array(35)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '8px',
                    background: i % 5 === 0
                      ? 'rgba(124,58,237,0.15)'
                      : 'rgba(255,255,255,0.03)',
                    border: i % 5 === 0
                      ? '1px solid rgba(124,58,237,0.3)'
                      : '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i % 7 && (
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(240,240,255,0.3)',
                    }}>
                      {(i % 28) + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Floating stat bubbles */}
          <motion.div
            animate={{ y: -20 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: '-40px',
              right: '40px',
              padding: '12px 20px',
              borderRadius: '12px',
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.3)',
              fontSize: '12px',
              fontWeight: 600,
              zIndex: 10,
            }}
          >
            📈 +340% engagement
          </motion.div>

          <motion.div
            animate={{ y: 20 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              bottom: '-60px',
              left: '60px',
              padding: '12px 20px',
              borderRadius: '12px',
              background: 'rgba(79,70,229,0.15)',
              border: '1px solid rgba(79,70,229,0.3)',
              fontSize: '12px',
              fontWeight: 600,
              zIndex: 10,
            }}
          >
            ✓ Auto-publication activée
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Band */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '100px 48px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
        }}>
          <StatCard value='12 000+' label='Posts créés' delay={0} />
          <StatCard value='98%' label='Taux de succès' delay={0.1} />
          <StatCard value='5 000+' label='Utilisateurs' delay={0.2} />
          <StatCard value='2 min' label='Temps de setup' delay={0.3} />
        </div>
      </section>

      {/* Features Section */}
      <section id='features' style={{
        position: 'relative',
        zIndex: 1,
        padding: '100px 48px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '64px',
        }}>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '99px',
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.25)',
              color: '#A78BFA',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            Fonctionnalités
          </motion.span>
          <FadeInUp>
            <h2 style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(32px, 4vw, 52px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: '#F0F0FF',
            }}>
              Tout ce dont vous avez{' '}
              <span style={{
                background: 'linear-gradient(120deg, #A78BFA 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                besoin
              </span>
            </h2>
          </FadeInUp>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          <FeatureCard
            icon={Calendar}
            title='Calendrier éditorial'
            description='Planifiez vos posts sur un calendrier visuel. Glissez-déposez pour réorganiser facilement.'
            delay={0}
          />
          <FeatureCard
            icon={Upload}
            title='Import en masse'
            description='Importez vos contenus depuis Word, Excel ou CSV. Publication automatique selon votre planning.'
            delay={0.1}
          />
          <FeatureCard
            icon={Zap}
            title='Publication automatique'
            description="Publiez directement sur LinkedIn à l'heure choisie. Sans besoin d'intervention manuelle."
            delay={0.2}
          />
          <FeatureCard
            icon={BarChart3}
            title='Analytics détaillées'
            description='Suivi en temps réel de vos performances. Identifiez les meilleurs horaires de publication.'
            delay={0.3}
          />
          <FeatureCard
            icon={Sparkles}
            title='Prévisualisation réaliste'
            description={"Voyez exactement comment votre post s'affichera sur LinkedIn avant publication."}
            delay={0.4}
          />
          <FeatureCard
            icon={Shield}
            title='Sécurité & confidentialité'
            description='Hébergement européen, conformité RGPD complète. Vos données restent confidentielles.'
            delay={0.5}
          />
        </div>
      </section>

      {/* Testimonials */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '100px 48px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '64px',
        }}>
          <FadeInUp>
            <h2 style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(32px, 4vw, 52px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: '#F0F0FF',
            }}>
              Ce que les utilisateurs en{' '}
              <span style={{
                background: 'linear-gradient(120deg, #A78BFA 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                disent
              </span>
            </h2>
          </FadeInUp>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          <TestimonialCard
            initials='SM'
            name='Sophie Martin'
            role='Coach Business · 18K abonnés'
            quote={"ContentFlow a transformé ma stratégie LinkedIn. J'ai doublé mon engagement en 3 mois et économisé 5h par semaine."}
            avatarColor='#A78BFA'
            delay={0}
          />
          <TestimonialCard
            initials='TR'
            name='Thomas Renard'
            role='Fondateur SaaS · 9K abonnés'
            quote='La prévisualisation est bluffante. Je planifie tout mon contenu du mois en 2h le dimanche.'
            avatarColor='#7C3AED'
            delay={0.1}
          />
          <TestimonialCard
            initials='CD'
            name='Camille Dupont'
            role='Consultante RH · 12K abonnés'
            quote="Les templates m'ont sauvé. Je n'avais plus de blocage créatif, résultat : 3x plus de leads."
            avatarColor='#10B981'
            delay={0.2}
          />
        </div>
      </section>

      {/* Pricing */}
      <section id='pricing' style={{
        position: 'relative',
        zIndex: 1,
        padding: '100px 48px',
        maxWidth: '1000px',
        margin: '0 auto',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '64px',
        }}>
          <FadeInUp>
            <h2 style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(32px, 4vw, 52px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: '#F0F0FF',
            }}>
              Tarifs{' '}
              <span style={{
                background: 'linear-gradient(120deg, #A78BFA 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                simples et transparents
              </span>
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p style={{
              fontSize: '16px',
              color: 'rgba(240,240,255,0.6)',
              marginTop: '16px',
            }}>
              Aucune carte de crédit requise. Commencez gratuitement.
            </p>
          </FadeInUp>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
        }}>
          <PricingCard
            name='Free'
            price='0'
            description='Pour découvrir ContentFlow'
            isHighlight={false}
            features={[
              '3 posts programmés par semaine',
              'Calendrier simplifié',
              'Support par email',
              'Export basique des données',
            ]}
            delay={0}
          />
          <PricingCard
            name='Premium'
            price='29'
            description='Pour les créateurs sérieux'
            isHighlight={true}
            features={[
              'Posts illimités',
              'Calendrier avancé',
              'Import en masse',
              'Analytics détaillées',
              'Priorité support',
              'API access',
            ]}
            delay={0.1}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '80px 48px',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <FadeInUp>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 52px)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: '#F0F0FF',
            marginBottom: '24px',
          }}>
            Prêt à transformer votre LinkedIn ?
          </h2>
        </FadeInUp>
        <FadeInUp delay={0.1}>
          <p style={{
            fontSize: '16px',
            color: 'rgba(240,240,255,0.6)',
            marginBottom: '40px',
          }}>
            Rejoignez 5000+ créateurs qui publient smarter avec ContentFlow.
          </p>
        </FadeInUp>
        <FadeInUp delay={0.2}>
          <button style={{
            padding: '14px 40px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
            color: 'white',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 40px rgba(124,58,237,0.4)',
          }}>
            Commencer gratuitement
            <ArrowRight size={18} />
          </button>
        </FadeInUp>
      </section>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        padding: '60px 48px 40px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        marginTop: '80px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '16px',
            marginBottom: '32px',
          }}>
            ContentFlow
          </p>
          <p style={{
            fontSize: '13px',
            color: 'rgba(240,240,255,0.5)',
            marginBottom: '32px',
          }}>
            Publiez sur LinkedIn. Libérez votre productivité.
          </p>
          <div style={{
            display: 'flex',
            gap: '24px',
            justifyContent: 'center',
            marginBottom: '32px',
            fontSize: '12px',
          }}>
            <Link href='#' style={{ color: 'rgba(240,240,255,0.5)', textDecoration: 'none' }}>
              Conditions
            </Link>
            <Link href='#' style={{ color: 'rgba(240,240,255,0.5)', textDecoration: 'none' }}>
              Confidentialité
            </Link>
            <Link href='#' style={{ color: 'rgba(240,240,255,0.5)', textDecoration: 'none' }}>
              Contact
            </Link>
          </div>
          <p style={{
            fontSize: '12px',
            color: 'rgba(240,240,255,0.3)',
          }}>
            © 2026 ContentFlow. Tous droits réservés.
          </p>
        </div>
      </footer>

      {/* Global Animation Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');

        @keyframes text-shine {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}
