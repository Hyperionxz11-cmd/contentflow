'use client'

import {
  Calendar, Layout, Zap, ArrowRight, CheckCircle,
  Sparkles, BarChart3, Star, TrendingUp, Shield,
  ChevronDown, Play, Bell, Layers,
  Twitter, Linkedin, Instagram,
  Check, X
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

// ──────────────────── DATA ────────────────────

const stats = [
  { value: '12 000+', label: 'créateurs actifs' },
  { value: '4.9/5', label: 'note moyenne' },
  { value: '98%', label: 'taux de satisfaction' },
  { value: '2M+', label: 'posts programmés' },
]

const features = [
  {
    icon: Calendar,
    title: 'Calendrier drag & drop',
    description: 'Visualise tout ton mois en un coup d\'œil. Déplace tes posts d\'un simple glisser-déposer. Vue jour, semaine ou mois.',
    badge: 'Populaire',
    color: 'blue',
  },
  {
    icon: Sparkles,
    title: 'Preview LinkedIn temps réel',
    description: 'Vois exactement comment ton post s\'affichera sur LinkedIn avant de l\'envoyer. Texte, images, hashtags — tout est fidèle.',
    badge: null,
    color: 'purple',
  },
  {
    icon: Layout,
    title: '50+ templates éprouvés',
    description: 'Storytelling, tips, carrousel, sondage, témoignage... Choisis un template, adapte-le à ta voix, publie. Aussi simple que ça.',
    badge: 'Nouveau',
    color: 'emerald',
  },
  {
    icon: BarChart3,
    title: 'Analytics actionables',
    description: 'Vues, impressions, taux d\'engagement, meilleurs horaires de publication. Des données claires pour publier au bon moment.',
    badge: null,
    color: 'orange',
  },
  {
    icon: Bell,
    title: 'Rappels intelligents',
    description: 'Reçois des rappels au bon moment pour ne jamais manquer une publication. ContentFlow s\'adapte à ton rythme.',
    badge: null,
    color: 'pink',
  },
  {
    icon: Shield,
    title: 'Sécurité & confidentialité',
    description: 'Tes données ne sont jamais revendues. Hébergement européen, conformité RGPD totale. Tu gardes le contrôle.',
    badge: null,
    color: 'teal',
  },
]

const testimonials = [
  {
    name: 'Sophie Martin',
    role: 'Coach Business · 18 000 abonnés',
    avatar: 'SM',
    avatarColor: '#A78BFA',
    quote: 'ContentFlow a transformé ma stratégie LinkedIn. En 3 mois j\'ai doublé mon engagement et économisé 5h par semaine. Indispensable.',
    stars: 5,
  },
  {
    name: 'Thomas Renard',
    role: 'Fondateur SaaS · 9 000 abonnés',
    avatar: 'TR',
    avatarColor: '#7c3aed',
    quote: 'La prévisualisation est bluffante de fidélité. Je planifie tout mon contenu du mois en 2h le dimanche, et ContentFlow fait le reste.',
    stars: 5,
  },
  {
    name: 'Camille Dupont',
    role: 'Consultante RH · 12 000 abonnés',
    avatar: 'CD',
    avatarColor: '#10b981',
    quote: 'Les templates m\'ont sauvé la mise. Je ne sais jamais quoi écrire, mais avec ContentFlow j\'ai toujours une base. Résultat : 3x plus de leads.',
    stars: 5,
  },
]

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Pour tester et démarrer',
    features: [
      { text: '3 posts programmés/semaine', included: true },
      { text: 'Calendrier basique', included: true },
      { text: '5 templates inclus', included: true },
      { text: 'Preview LinkedIn', included: true },
      { text: 'Analytics avancés', included: false },
      { text: 'Templates illimités', included: false },
      { text: 'Support prioritaire', included: false },
    ],
    cta: 'Commencer gratuitement',
    popular: false,
  },
  {
    name: 'Premium',
    price: '9',
    description: 'Pour les créateurs sérieux',
    features: [
      { text: 'Posts illimités', included: true },
      { text: 'Calendrier complet', included: true },
      { text: '50+ templates premium', included: true },
      { text: 'Preview LinkedIn', included: true },
      { text: 'Analytics avancés', included: true },
      { text: 'Rappels intelligents', included: true },
      { text: 'Support prioritaire', included: true },
    ],
    cta: 'Commencer l\'essai gratuit',
    popular: true,
  },
]

const faqs = [
  {
    q: 'Est-ce que ContentFlow publie vraiment à ma place sur LinkedIn ?',
    a: 'Oui ! ContentFlow utilise l\'API officielle LinkedIn. Tu prépares tes posts à l\'avance, tu définis la date et l\'heure, et nous publions automatiquement. Tu peux aussi recevoir une notification avant publication pour valider.',
  },
  {
    q: 'Puis-je essayer ContentFlow gratuitement ?',
    a: 'Absolument. Le plan Free est gratuit à vie, sans carte bancaire. Tu peux programmer jusqu\'à 3 posts par semaine et accéder aux fonctionnalités essentielles.',
  },
  {
    q: 'Mes données LinkedIn sont-elles en sécurité ?',
    a: 'Totalement. Nous utilisons l\'authentification OAuth officielle LinkedIn et n\'avons jamais accès à ton mot de passe. Tes données sont hébergées en Europe et ne sont jamais revendues.',
  },
  {
    q: 'Puis-je annuler mon abonnement à tout moment ?',
    a: 'Oui, sans engagement, sans frais cachés. Tu annules en un clic depuis ton tableau de bord. L\'accès Premium reste actif jusqu\'à la fin de la période payée.',
  },
  {
    q: 'ContentFlow fonctionne-t-il sur mobile ?',
    a: 'Oui, l\'interface est entièrement responsive. Tu peux planifier, modifier et suivre tes posts depuis ton téléphone ou ta tablette, n\'importe où.',
  },
]

// ──────────────────── COMPONENTS ────────────────────

const colorMap: Record<string, { bg: string; icon: string; badge: string }> = {
  blue:    { bg: 'bg-blue-500/15', icon: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  purple:  { bg: 'bg-purple-500/15', icon: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
  emerald: { bg: 'bg-emerald-500/15', icon: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  orange:  { bg: 'bg-orange-500/15', icon: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300' },
  pink:    { bg: 'bg-pink-500/15', icon: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-300' },
  teal:    { bg: 'bg-teal-500/15', icon: 'text-teal-400', badge: 'bg-teal-500/20 text-teal-300' },
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden bg-[#111116]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-[#17171E] transition-colors"
      >
        <span className="font-semibold text-[#FAFAFA] pr-4 text-sm sm:text-base" style={{ fontFamily: 'Syne, sans-serif' }}>{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#71717A] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 text-[#A1A1AA] leading-relaxed text-sm">
          {a}
        </div>
      )}
    </div>
  )
}

// ──────────────────── PAGE ────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090B] overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 w-full bg-[#09090B]/80 backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)] z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-[#FAFAFA] tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>ContentFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A1A1AA]">
            <a href="#features" className="hover:text-[#FAFAFA] transition-colors">Fonctionnalités</a>
            <a href="#how" className="hover:text-[#FAFAFA] transition-colors">Comment ça marche</a>
            <a href="#pricing" className="hover:text-[#FAFAFA] transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-[#FAFAFA] transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">
              Connexion
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] px-5 py-2.5 rounded-full transition-all hover:shadow-lg hover:shadow-purple-500/30"
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Gradient radial violet subtil */}
        <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[rgba(124,58,237,0.08)] rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[rgba(124,58,237,0.1)] text-[#A78BFA] text-sm font-semibold px-4 py-1.5 rounded-full mb-8 border border-[#7C3AED]/30">
            <Sparkles className="w-3.5 h-3.5" />
            Nouveau · Templates IA disponibles
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#FAFAFA] leading-[1.05] tracking-tight mb-6" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}>
            Ton LinkedIn en
            <br />
            <span className="bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] bg-clip-text text-transparent">pilote automatique</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-[#A1A1AA] max-w-2xl mx-auto mb-10 leading-relaxed">
            Planifie, prévisualise et publie tes posts LinkedIn automatiquement.{' '}
            <strong className="text-[#FAFAFA] font-semibold">Gagne 5h par semaine.</strong>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/signup"
              className="flex items-center gap-2 text-base font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] px-8 py-4 rounded-full transition-all hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-0.5"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how"
              className="flex items-center gap-2 text-base font-semibold text-[#FAFAFA] bg-[#17171E] hover:bg-[#1C1C24] px-8 py-4 rounded-full border border-[rgba(255,255,255,0.12)] transition-all"
            >
              <Play className="w-4 h-4 text-[#7C3AED]" fill="currentColor" />
              Voir comment ça marche
            </a>
          </div>
          <p className="text-sm text-[#71717A]">✓ Gratuit à vie &nbsp;·&nbsp; ✓ Sans carte bancaire &nbsp;·&nbsp; ✓ Prêt en 2 minutes</p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-12 px-6 border-y border-[rgba(255,255,255,0.07)] bg-[#09090B]">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-extrabold text-[#FAFAFA] tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>{stat.value}</div>
                <div className="text-sm text-[#71717A] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Interface</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#FAFAFA]" style={{ fontFamily: 'Syne, sans-serif' }}>Simple. Beau. Efficace.</h2>
          </div>

          {/* Browser mockup */}
          <div className="bg-gradient-to-br from-[#1C1C24] via-[#17171E] to-[#111116] rounded-3xl p-2 shadow-2xl ring-1 ring-[rgba(255,255,255,0.1)]">
            <div className="bg-[#111116] rounded-2xl overflow-hidden">
              {/* Chrome bar */}
              <div className="bg-[#17171E] border-b border-[rgba(255,255,255,0.07)] px-5 py-3 flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/40" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/40" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
                </div>
                <div className="flex-1 max-w-xs bg-[#1C1C24] border border-[rgba(255,255,255,0.07)] rounded-md h-7 flex items-center px-3 gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#71717A]" />
                  <span className="text-xs text-[#71717A]">contentflow.app/dashboard</span>
                </div>
              </div>

              {/* App */}
              <div className="flex min-h-[360px]">
                {/* Sidebar */}
                <div className="hidden sm:flex w-52 bg-[#09090B] border-r border-[rgba(255,255,255,0.07)] p-4 flex-col gap-1 flex-shrink-0">
                  <div className="flex items-center gap-2 px-3 py-2 mb-4">
                    <div className="w-6 h-6 bg-[#7C3AED] rounded flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-bold text-[#FAFAFA]">ContentFlow</span>
                  </div>
                  {[
                    { icon: Calendar, label: 'Calendrier', active: true },
                    { icon: Layout, label: 'Templates', active: false },
                    { icon: BarChart3, label: 'Analytics', active: false },
                    { icon: Layers, label: 'Mes posts', active: false },
                  ].map(({ icon: Icon, label, active }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer ${
                        active ? 'bg-[#7C3AED]/20 text-[#A78BFA] font-semibold' : 'text-[#71717A] hover:bg-[#17171E]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                  ))}
                </div>

                {/* Calendar */}
                <div className="flex-1 p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-[#FAFAFA]">Mars 2026</h3>
                    <div className="flex gap-1">
                      <span className="px-2.5 py-1 text-xs font-semibold bg-[#7C3AED] text-white rounded-md">Semaine</span>
                      <span className="px-2.5 py-1 text-xs font-medium text-[#71717A] rounded-md">Mois</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-[#71717A] mb-2">
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 7 }, (_, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-2 text-xs min-h-[80px] ${
                          i === 0 ? 'border-[#7C3AED]/30 bg-[#7C3AED]/10' : 'border-[rgba(255,255,255,0.07)]'
                        }`}
                      >
                        <span className={`font-medium ${i === 0 ? 'text-[#A78BFA]' : 'text-[#71717A]'}`}>
                          {16 + i}
                        </span>
                        {i === 0 && (
                          <div className="mt-1.5 space-y-1">
                            <div className="bg-[#7C3AED] text-white rounded px-1 py-0.5 text-[9px] truncate">📝 5 tips LinkedIn...</div>
                            <div className="bg-[#7C3AED]/20 text-[#A78BFA] rounded px-1 py-0.5 text-[9px]">⏰ 09:00</div>
                          </div>
                        )}
                        {i === 2 && <div className="mt-1.5 bg-emerald-500 text-white rounded px-1 py-0.5 text-[9px] truncate">🎯 Mon story...</div>}
                        {i === 4 && <div className="mt-1.5 bg-purple-600 text-white rounded px-1 py-0.5 text-[9px] truncate">📊 Carrousel...</div>}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-4">
                    {[
                      { label: '12 posts ce mois', cls: 'bg-[#7C3AED]/20 text-[#A78BFA]' },
                      { label: '3 en attente', cls: 'bg-[#F59E0B]/20 text-[#F59E0B]' },
                      { label: '↑ 34% engagement', cls: 'bg-[#10B981]/20 text-[#10B981]' },
                    ].map(({ label, cls }) => (
                      <div key={label} className={`flex-1 rounded-lg ${cls} px-2 py-1.5 text-[10px] font-semibold text-center`}>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 bg-[#09090B]" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Fonctionnalités</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              Tout ce qu'il te faut pour dominer LinkedIn
            </h2>
            <p className="text-lg text-[#A1A1AA] max-w-xl mx-auto">
              Pas de superflu. Chaque fonctionnalité a été pensée pour une seule chose : te faire gagner du temps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const c = colorMap[feature.color]
              return (
                <div
                  key={idx}
                  className="bg-[#111116] rounded-xl p-7 border border-[rgba(255,255,255,0.07)] hover:border-[#7C3AED]/50 hover:bg-[#17171E] transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}>
                      <feature.icon className={`w-6 h-6 ${c.icon}`} />
                    </div>
                    {feature.badge && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
                        {feature.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-[#FAFAFA] mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{feature.title}</h3>
                  <p className="text-[#A1A1AA] leading-relaxed text-sm">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6" id="how">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Processus</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#FAFAFA]" style={{ fontFamily: 'Syne, sans-serif' }}>Lancé en 3 étapes chrono</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-10">
            {[
              {
                num: '01',
                icon: Linkedin,
                title: 'Connecte LinkedIn',
                desc: 'Un clic pour autoriser ContentFlow via OAuth officiel. Sécurisé, sans mot de passe stocké.',
                bg: 'bg-[#7C3AED]',
              },
              {
                num: '02',
                icon: Calendar,
                title: 'Planifie tes posts',
                desc: 'Crée, programme, prévisualise. Utilise les templates ou pars de zéro. Tout en quelques minutes.',
                bg: 'bg-purple-600',
              },
              {
                num: '03',
                icon: TrendingUp,
                title: 'Suis tes résultats',
                desc: 'ContentFlow publie au bon moment et te montre ce qui fonctionne pour accélérer ta croissance.',
                bg: 'bg-emerald-500',
              },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className={`relative w-20 h-20 ${item.bg} rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30`}>
                  <item.icon className="w-8 h-8 text-white" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#09090B] border-2 border-[#7C3AED] rounded-full text-xs font-bold text-[#A78BFA] flex items-center justify-center shadow-sm">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#FAFAFA] mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{item.title}</h3>
                <p className="text-[#A1A1AA] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6 bg-[#09090B]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Témoignages</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#FAFAFA]" style={{ fontFamily: 'Syne, sans-serif' }}>Ils ont transformé leur LinkedIn</h2>
            <p className="text-[#A1A1AA] mt-4 max-w-md mx-auto">
              Des créateurs, consultants et fondateurs qui ont adopté ContentFlow.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-[#111116] border border-[rgba(255,255,255,0.07)] rounded-xl p-7 hover:border-[#7C3AED]/30 hover:bg-[#17171E] transition-colors"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                <p className="text-[#A1A1AA] mb-6 leading-relaxed text-sm">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: t.avatarColor }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-[#FAFAFA] text-sm">{t.name}</div>
                    <div className="text-[#71717A] text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-[#A1A1AA] text-sm">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <span className="font-bold text-[#FAFAFA] text-lg">4.9</span>
            </div>
            <span className="hidden sm:block text-[#71717A]">·</span>
            <span>Basé sur <strong className="text-[#FAFAFA]">847 avis</strong> vérifiés</span>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-24 px-6 bg-[#09090B]" id="pricing">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Tarifs</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>Simple et transparent</h2>
          <p className="text-lg text-[#A1A1AA] mb-12">Commence gratuitement. Passe en Premium quand tu es prêt.</p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-[#111116] rounded-2xl p-8 border-2 text-left ${
                  plan.popular
                    ? 'border-[#7C3AED] shadow-2xl shadow-purple-500/20'
                    : 'border-[rgba(255,255,255,0.07)]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-[#7C3AED] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-purple-500/40">
                      ⭐ Le plus populaire
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[#FAFAFA]" style={{ fontFamily: 'Syne, sans-serif' }}>{plan.name}</h3>
                  <p className="text-sm text-[#71717A] mt-1">{plan.description}</p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-5xl font-extrabold text-[#FAFAFA]" style={{ fontFamily: 'Syne, sans-serif' }}>{plan.price}€</span>
                    <span className="text-[#71717A] pb-1">/mois</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      {f.included
                        ? <Check className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                        : <X className="w-5 h-5 text-[#71717A] flex-shrink-0" />
                      }
                      <span className={f.included ? 'text-[#FAFAFA]' : 'text-[#71717A]'}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`block text-center py-3.5 rounded-xl font-bold text-sm transition-all ${
                    plan.popular
                      ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] hover:shadow-md'
                      : 'bg-[#17171E] text-[#FAFAFA] hover:bg-[#1C1C24] border border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  {plan.cta}
                </Link>
                {plan.popular && (
                  <p className="text-center text-xs text-[#71717A] mt-3">14 jours d'essai · Sans carte bancaire</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6 bg-[#09090B]" id="faq">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl font-bold text-[#FAFAFA]" style={{ fontFamily: 'Syne, sans-serif' }}>Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-[#7C3AED] to-purple-700 rounded-2xl px-8 py-16 text-center overflow-hidden">
            <div aria-hidden className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-32 -translate-y-32" />
            <div aria-hidden className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-20 translate-y-20" />

            <div className="relative z-10">
              <div className="flex justify-center mb-6 gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
                Prêt à faire exploser ta présence LinkedIn ?
              </h2>
              <p className="text-purple-100 text-lg max-w-md mx-auto mb-10">
                Rejoins 12 000+ créateurs qui font confiance à ContentFlow pour leur stratégie de contenu.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="flex items-center gap-2 text-base font-bold text-[#7C3AED] bg-white hover:bg-gray-100 px-8 py-4 rounded-full transition-all hover:shadow-xl"
                >
                  Commencer gratuitement
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <p className="text-purple-100 text-sm">✓ Sans carte · ✓ Setup en 2 min</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#09090B] border-t border-[rgba(255,255,255,0.07)] pt-12 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-[#FAFAFA]" style={{ fontFamily: 'Syne, sans-serif' }}>ContentFlow</span>
              </div>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                La solution de planification LinkedIn la plus simple pour les créateurs de contenu.
              </p>
              <div className="flex gap-3 mt-5">
                {[Twitter, Linkedin, Instagram].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-8 h-8 rounded-lg bg-[#17171E] border border-[rgba(255,255,255,0.07)] flex items-center justify-center hover:border-[#7C3AED] hover:text-[#A78BFA] text-[#71717A] transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {[
              {
                title: 'Produit',
                links: [
                  { label: 'Fonctionnalités', href: '#features' },
                  { label: 'Tarifs', href: '#pricing' },
                  { label: 'FAQ', href: '#faq' },
                  { label: 'Nouveautés', href: '#' },
                ],
              },
              {
                title: 'Ressources',
                links: [
                  { label: 'Blog', href: '#' },
                  { label: 'Guides LinkedIn', href: '#' },
                  { label: 'Templates gratuits', href: '#' },
                  { label: 'Support', href: '#' },
                ],
              },
              {
                title: 'Légal',
                links: [
                  { label: 'Confidentialité', href: '#' },
                  { label: 'CGU', href: '#' },
                  { label: 'Mentions légales', href: '#' },
                  { label: 'RGPD', href: '#' },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-bold text-[#FAFAFA] mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>{col.title}</h4>
                <ul className="space-y-3 text-sm text-[#A1A1AA]">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="hover:text-[#FAFAFA] transition-colors">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-[rgba(255,255,255,0.07)] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#71717A]">
            <p>&copy; 2026 ContentFlow. Tous droits réservés.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>Tous les systèmes opérationnels</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
