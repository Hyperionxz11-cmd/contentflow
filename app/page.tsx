'use client'

import { Calendar, Clock, Layout, Zap, ArrowRight, CheckCircle, Sparkles, BarChart3 } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Calendar,
    title: 'Calendrier visuel',
    description: 'Planifie tes posts sur un calendrier drag & drop. Vue jour, semaine ou mois.',
  },
  {
    icon: Layout,
    title: 'Templates prêts à l\'emploi',
    description: 'Bibliothèque de templates pour chaque type de post : storytelling, tips, carrousel...',
  },
  {
    icon: Sparkles,
    title: 'Preview LinkedIn',
    description: 'Visualise exactement comment ton post apparaîtra sur LinkedIn avant de publier.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Suis tes publications, historique et performances en un coup d\'œil.',
  },
]

const plans = [
  {
    name: 'Free',
    price: '0',
    features: ['3 posts programmés/semaine', 'Calendrier basique', '5 templates', 'Preview LinkedIn'],
    cta: 'Commencer gratuitement',
    popular: false,
  },
  {
    name: 'Premium',
    price: '9',
    features: ['Posts illimités', 'Calendrier complet', 'Tous les templates', 'Preview LinkedIn', 'Analytics avancés', 'Support prioritaire'],
    cta: 'Passer en Premium',
    popular: true,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ContentFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Connexion
            </Link>
            <Link href="/signup" className="text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-5 py-2.5 rounded-full transition-colors">
              Essai gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[var(--primary-light)] text-[var(--primary)] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            La planification LinkedIn simplifiée
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
            Planifie ton contenu
            <br />
            <span className="text-[var(--primary)]">LinkedIn</span> sans effort
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Prépare tous tes posts à l'avance, visualise-les sur un calendrier,
            et laisse ContentFlow publier automatiquement au bon moment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="flex items-center gap-2 text-base font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-8 py-4 rounded-full transition-all hover:shadow-lg hover:shadow-blue-200">
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-sm text-gray-400">Pas de carte bancaire requise</p>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-3 shadow-2xl">
            <div className="bg-gray-100 rounded-xl overflow-hidden">
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-gray-100 rounded-md h-7 flex items-center px-3">
                  <span className="text-xs text-gray-400">contentflow.app/dashboard</span>
                </div>
              </div>
              {/* Mock Calendar */}
              <div className="p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Mars 2026</h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 text-xs font-medium bg-[var(--primary-light)] text-[var(--primary)] rounded-md">Semaine</span>
                    <span className="px-3 py-1 text-xs font-medium text-gray-400 rounded-md">Mois</span>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-400 mb-2">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i} className="aspect-square rounded-lg border border-gray-100 p-1.5 text-xs">
                      <span className="text-gray-500">{16 + i}</span>
                      {i === 0 && <div className="mt-1 bg-[var(--primary)] text-white rounded px-1 py-0.5 text-[10px] truncate">Post: 5 tips...</div>}
                      {i === 2 && <div className="mt-1 bg-emerald-500 text-white rounded px-1 py-0.5 text-[10px] truncate">Story: Mon...</div>}
                      {i === 4 && <div className="mt-1 bg-amber-500 text-white rounded px-1 py-0.5 text-[10px] truncate">Carrousel...</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-gray-50" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Tout ce qu'il te faut pour LinkedIn
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Un outil simple et beau pour préparer tout ton contenu à l'avance.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-[var(--primary)]/20 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary-light)] flex items-center justify-center mb-5 group-hover:bg-[var(--primary)] transition-colors">
                  <feature.icon className="w-6 h-6 text-[var(--primary)] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-16">
            3 étapes, c'est tout
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Connecte LinkedIn', desc: 'Un clic pour lier ton compte. Tes données restent privées.' },
              { step: '2', title: 'Planifie tes posts', desc: 'Utilise le calendrier ou les templates pour préparer ton contenu.' },
              { step: '3', title: 'On publie pour toi', desc: 'ContentFlow poste automatiquement au jour et à l\'heure choisis.' },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-[var(--primary)] text-white text-2xl font-bold flex items-center justify-center mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-gray-50" id="pricing">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tarifs simples
          </h2>
          <p className="text-lg text-gray-500 mb-12">Commence gratuitement, passe en Premium quand tu veux.</p>
          <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div key={plan.name} className={`bg-white rounded-2xl p-8 border-2 text-left ${plan.popular ? 'border-[var(--primary)] shadow-lg shadow-blue-100' : 'border-gray-100'}`}>
                {plan.popular && (
                  <span className="inline-block bg-[var(--primary)] text-white text-xs font-bold px-3 py-1 rounded-full mb-4">Populaire</span>
                )}
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-3 mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}€</span>
                  <span className="text-gray-400">/mois</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`block text-center py-3 rounded-full font-semibold transition-colors ${plan.popular ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Prêt à planifier ton LinkedIn ?
          </h2>
          <p className="text-lg text-gray-500 mb-8">
            Rejoins ContentFlow et ne rate plus jamais un post.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 text-base font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-8 py-4 rounded-full transition-all hover:shadow-lg hover:shadow-blue-200">
            Commencer maintenant
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[var(--primary)] rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-600">ContentFlow</span>
          </div>
          <p>&copy; 2026 ContentFlow. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
