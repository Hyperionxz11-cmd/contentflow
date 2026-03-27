# ContentFlow — SESSION STATE
> **CLAUDE : LIS CE FICHIER EN PREMIER AVANT TOUTE ACTION**
> Mis à jour à chaque fin de session. C'est la source de vérité sur l'état actuel.

---

## ⚡ État instantané (mise à jour : 2026-03-27 — session 2)

| Info | Valeur |
|------|--------|
| **HEAD local** | `0dee5f9` — fix: supprimer framer-motion + corriger import bulk |
| **Dernier push GitHub** | `0dee5f9` — ✅ POUSSÉ 2026-03-27 |
| **Production Vercel** | https://contentflow-gilt.vercel.app |
| **Dernier déploiement stable** | `0dee5f9` — fix import bulk (en déploiement) |
| **Plan André** | TEAM |
| **Index git** | ✅ Propre (HEAD.lock détecté + supprimé par plumbing) |
| **Branch active** | `main` |

---

## ⚠️ ACTIONS REQUISES AU PROCHAIN DÉMARRAGE

1. **Vérifier Vercel auto-deploy** de `0dee5f9` sur https://vercel.com/dashboard
2. **HEAD.lock** régulièrement stale — utiliser git plumbing si `git commit` échoue (voir RÈGLES GIT #6)

---

## ✅ Fonctionnalités actuellement en production

| Feature | Status | Commit |
|---------|--------|--------|
| Landing page (Tailwind, sans framer-motion) | ✅ PROD | `5385d6c` |
| Import multi-posts (rule-based + IA) | ✅ PUSHED | `0dee5f9` |
| Dashboard sans framer-motion (React 19 fix) | ✅ PUSHED | `0dee5f9` |
| handleBulkImport erreur silencieuse fixée | ✅ PUSHED | `0dee5f9` |
| htmlToText — marqueurs Semaine X préservés | ✅ PUSHED | `0dee5f9` |
| API import multipart — blocage DOCX/PDF binaire | ✅ PUSHED | `0dee5f9` |
| Free plan gate (teaser → upgrade modal) | ✅ PROD | `fbc955e` |
| Bulk schedule (timeline preview + success) | ✅ PROD | `9c34893` |
| Quotas IA par plan (imports + reformulations) | ✅ PROD | `fe5a04b` |
| BulkImport fréquences (daily/3x week/weekdays/weekly) | ✅ PUSHED | `0dee5f9` |
| Login/Signup refactorisés (sans framer-motion) | ✅ PUSHED | `0dee5f9` |

---

## 🏗️ Architecture clé

```
app/
├── page.tsx              # Landing page (Tailwind, sans framer-motion)
├── dashboard/page.tsx    # Dashboard principal
├── login/page.tsx        # Login simplifié
├── signup/page.tsx       # Signup simplifié
└── api/
    ├── import/route.ts           # Split doc → posts
    ├── ai/reformulate/route.ts   # Reformulation IA
    ├── cron/publish/route.ts     # Cron LinkedIn (8h/jour)
    ├── linkedin/                 # Auth + callback + post
    └── stripe/                   # Checkout + webhook

components/
├── dashboard/BulkImport.tsx   # ⭐ composant principal (4 étapes)
├── calendar/CalendarView.tsx
├── post/PostEditor.tsx
└── analytics/Analytics.tsx

lib/
├── supabase.ts / supabase-server.ts
└── linkedin.ts
```

---

## 💰 Plans tarifaires actifs

| Plan | Prix | Imports IA/mois | Reformulations/mois |
|------|------|-----------------|---------------------|
| free | 0€ | 0 (rule-based only) | 0 |
| solo | 9€/mois | 5 | 20 |
| agence | 29€/mois | 20 | 80 |
| team | — | illimité | illimité |

---

## 🚨 RÈGLES ABSOLUES GIT (ne jamais déroger)

1. **Toujours lire ce fichier + WORK_LOG.md avant tout commit**
2. **Ne jamais `git add .` ou `git add -A`** — toujours stagier fichier par fichier
3. **Avant tout commit : `git log --oneline -3` pour voir où on en est**
4. **`git diff HEAD fichier` avant de committer un fichier**
5. **Les fichiers locaux du VM Linux NE SONT PAS forcément à jour** — toujours vérifier
6. **En cas de lock file** : ne pas crasher, utiliser python3 git plumbing (voir WORK_LOG)
7. **Mettre à jour ce fichier + WORK_LOG à chaque fin de session**

---

## 🔧 Problèmes connus

| Problème | Statut | Fix |
|---------|--------|-----|
| HEAD.lock stale récurrent | ⚠️ Actif | Git plumbing Python (write-tree → commit-tree → écrire ref) |
| `next.config.ts` sans ignoreBuildErrors | ⚠️ Risque | Tester build avant push |
