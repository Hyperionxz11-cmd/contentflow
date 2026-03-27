# ContentFlow — SESSION STATE
> **CLAUDE : LIS CE FICHIER EN PREMIER AVANT TOUTE ACTION**
> Mis à jour à chaque fin de session. C'est la source de vérité sur l'état actuel.

---

## ⚡ État instantané (mise à jour : 2026-03-27)

| Info | Valeur |
|------|--------|
| **HEAD local** | `64dc389` — fix: save uncommitted local work |
| **Dernier push GitHub** | `b07b348` — ⚠️ NON POUSSÉ (voir ci-dessous) |
| **Production Vercel** | https://contentflow-gilt.vercel.app |
| **Dernier déploiement stable** | `5385d6c` — landing page fix |
| **Plan André** | TEAM |
| **Index git** | ✅ Propre |
| **Branch active** | `main` |

---

## ⚠️ ACTIONS REQUISES AU PROCHAIN DÉMARRAGE

1. **Pusher le commit `64dc389` vers GitHub** (`git push origin main`)
2. **Vérifier Vercel auto-deploy** sur https://vercel.com/dashboard
3. **Supprimer manuellement depuis Windows** les fichiers lock stale :
   - `.git/index.lock`
   - `.git/refs/heads/main.lock`
   - `.git/refs/stash.lock`
   *(Ces fichiers bloquent git add/commit/stash depuis Linux)*

---

## ✅ Fonctionnalités actuellement en production

| Feature | Status | Commit |
|---------|--------|--------|
| Landing page (Tailwind, sans framer-motion) | ✅ PROD | `5385d6c` |
| Import multi-posts (rule-based + IA) | ✅ PROD | `fe5a04b` |
| Free plan gate (teaser → upgrade modal) | ✅ PROD | `fbc955e` |
| Bulk schedule (timeline preview + success) | ✅ PROD | `9c34893` |
| Quotas IA par plan (imports + reformulations) | ✅ PROD | `fe5a04b` |
| BulkImport fréquences (daily/3x week/weekdays/weekly) | ✅ LOCAL | `64dc389` |
| Login/Signup refactorisés (sans framer-motion) | ✅ LOCAL | `64dc389` |
| Pilier3 supprimé | ✅ LOCAL | `64dc389` |

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
| 3 fichiers lock stale (.git/*.lock) | ⚠️ Actif | Supprimer manuellement sur Windows |
| `next.config.ts` sans ignoreBuildErrors | ⚠️ Risque | Tester build avant push |
| Stash obsolète | ✅ Supprimé | — |
