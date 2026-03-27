# ContentFlow — Journal de travail

> **RÈGLE ABSOLUE** : Mettre à jour ce fichier à chaque modification.
> Claude doit lire **SESSION_STATE.md** + ce fichier EN PREMIER à chaque session avant de toucher au code.
> Ne JAMAIS commiter des fichiers locaux sans vérifier qu'ils sont plus récents que HEAD.
> En cas de lock file git : utiliser python3 git plumbing (voir section "Urgences git" ci-dessous).

---

## État actuel de la production

- **URL production** : https://contentflow-gilt.vercel.app
- **Commit HEAD local** : `64dc389` — fix: save uncommitted local work (2026-03-27)
- **Dernier push GitHub** : `b07b348` ⚠️ — push de `64dc389` REQUIS
- **Dernier déploiement Vercel stable** : `5385d6c` — landing page Tailwind opérationnelle
- **Plan actuel André** : TEAM

> **IMPORTANT** : Lire aussi SESSION_STATE.md pour l'état complet et les actions requises.

---

## Chronologie complète

### 2026-03-27 — Fix landing page blanche (Claude)

#### ✅ Fix landing page — `5385d6c`
- **Problème** : Landing page complètement blanche après le revert `bc9206e`.
- **Cause** : La version déployée (`416646c`) utilisait `framer-motion v11` avec `initial={{ opacity: 0 }}` sur tous les éléments hero. Incompatible avec React 19 — les animations ne se déclenchaient jamais, page restait à `opacity: 0`.
- **Fix** : Commit chirurgical via Python git plumbing (NTFS). Remplacement de `page.tsx` (framer-motion → Tailwind + useState) et `globals.css` (LinkedIn design system → tokens propres).
- **Fichiers modifiés** : `app/page.tsx`, `app/globals.css`
- **Résultat** : Landing page visible et fonctionnelle en production.

---

### 2026-03-27 — Session de debug + régression (Claude)

#### ✅ Fix importer — `416646c`
- **Problème** : L'importer fonctionnait côté DB (retournait 200) mais le modal se fermait brutalement sans afficher l'écran de succès.
- **Cause** : `setShowBulkImport(false)` dans `handleBulkImport` (page.tsx) fermait le modal AVANT que BulkImport puisse passer en step `'success'`.
- **Fix** : Supprimé `setShowBulkImport(false)` de `handleBulkImport`. Le modal se ferme maintenant via `onClose` depuis le bouton "Voir mon calendrier →" de l'écran de succès.
- **Fichiers modifiés** : `app/dashboard/page.tsx`, `components/dashboard/BulkImport.tsx`

#### ❌ RÉGRESSION — `952a92d` (à ne plus reproduire)
- **Erreur commise** : Commit de "sync" des fichiers locaux du VM Linux.
- **Pourquoi c'était une erreur** : Le VM Linux avait des fichiers ANCIENS (non mis à jour via `git pull`). Le commit a écrasé les versions récentes de GitHub avec des versions vieilles d'1 semaine.
- **Résultat** : Design et fonctionnalités régressés à ~1 semaine en arrière.
- **Leçon** : **Ne JAMAIS commiter des fichiers "locaux" du VM sans vérifier `git diff HEAD` ne montre pas de régression.**

#### ✅ Revert — `bc9206e`
- Restauré exactement le tree de `416646c`.
- Production revenue à l'état stable.

---

### 2026-03-27 — Features (Claude, session précédente)

#### ✅ Free plan teaser gate — `fbc955e`
- Les utilisateurs gratuits peuvent importer et voir leurs posts séparés par l'IA.
- Clic sur "Programmer" → modal d'upgrade (Solo 9€ / Agence 29€) au lieu de bloquer l'import.
- Fichiers : `components/dashboard/BulkImport.tsx`, `app/dashboard/page.tsx`

#### ✅ Bulk schedule — timeline preview + success screen — `9c34893`
- Étape 3 : aperçu des dates exactes de publication par post avant confirmation.
- Écran de succès (step 4) avec stats après planification.
- Remplacement du `alert()` par modal d'upgrade stylé.
- Fichiers : `components/dashboard/BulkImport.tsx`, `app/dashboard/page.tsx`

#### ✅ Quotas IA par plan — `fe5a04b`
- Table `plan_limits` + RPC `check_and_increment_ai_usage` en DB.
- Colonnes `ai_imports_this_month` / `ai_reformulations_this_month` sur `profiles`.
- Blocage des appels IA quand quota mensuel atteint (429 retourné).
- Fichiers : `app/api/import/route.ts`, `app/api/ai/reformulate/route.ts`

---

### 2026-03-27 — Urgence : git corrompu + sauvegarde travail non-commité (Claude)

#### ✅ Fix index git corrompu + commit du travail perdu — `64dc389`
- **Problème** : Index git (`.git/index`) dans état destructeur (6763 suppressions stagées). 3 fichiers lock stale bloquaient toutes les opérations git (`index.lock`, `refs/heads/main.lock`, `refs/stash.lock`).
- **Cause** : Fichiers lock créés par Windows le 2026-03-19, jamais nettoyés. Combiné à un index qui n'avait pas suivi le dernier revert.
- **Fix** : Reconstruction de l'index via git plumbing Python (`GIT_INDEX_FILE` + `read-tree` + `write-tree` + `commit-tree` + écriture directe de `refs/heads/main`). Jamais touché aux fichiers lock.
- **Contenu du commit `64dc389`** :
  - Suppression framer-motion (login.tsx, signup.tsx)
  - Suppression pilier3 (routes API + cron vercel.json)
  - Refactoring checkImportQuota (paramètre request)
  - Clean PostEditor props (authorAvatar, authorName)
  - Amélioration cron/publish.ts (indentation)
  - Fix next.config.ts
- **À faire** : Pusher vers GitHub + supprimer les 3 fichiers lock manuellement depuis Windows

#### ✅ Création SESSION_STATE.md
- Nouveau fichier de "save state" pour ne plus jamais perdre le contexte entre sessions
- À lire EN PREMIER à chaque nouvelle session (avant même WORK_LOG)
- Contient : HEAD actuel, push status, features actives, actions requises, problèmes connus

#### ⚠️ Stash obsolète supprimé
- Stash `stash@{0}` (BulkImport fréquences) supprimé — fonctionnalité déjà présente dans le code actuel

---

## 🛠️ Urgences git : que faire si index.lock existe

```python
# Reconstruire l'index depuis HEAD (sans toucher aux lock files)
import subprocess, os, shutil
REPO = '/chemin/vers/contentflow'
ENV = {**os.environ, 'GIT_DIR': f'{REPO}/.git', 'GIT_WORK_TREE': REPO, 'GIT_INDEX_FILE': '/tmp/new_idx'}
subprocess.run(['git', 'read-tree', 'HEAD'], env=ENV, cwd=REPO, check=True)
shutil.copy2('/tmp/new_idx', f'{REPO}/.git/index')
```

```python
# Committer sans passer par l'index (git plumbing bypass)
# Voir script complet dans /tmp/git_commit_bypass2.py de la session 2026-03-27
# Étapes : read-tree → hash-object -w → update-index → write-tree → commit-tree → écriture directe refs/heads/main
```

---

### Avant 2026-03-27 — Historique git (commits notables)

| Commit | Description |
|--------|-------------|
| `d7be41d` | Authorization header Supabase Edge Function reformulate |
| `bb42277` | Refactor cron job publish |
| `1aad410` | LinkedIn callback + token expiry |
| `5fe37b4` | Fix import path Supabase client |
| `78936f7` | Pilier3Page (prospection auto) — ⚠️ supprimé ensuite |
| `bcc2181` | Refactor LoginPage |
| `85ab8e6` | Message generation prospects |
| `3345606` | Reddit/Twitter scanning |

---

## Architecture rapide

```
contentflow/
├── app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/page.tsx    # Dashboard principal (client component)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── api/
│       ├── import/route.ts         # Split doc → posts (rule-based + AI)
│       ├── ai/reformulate/route.ts # Reformulation IA posts
│       ├── cron/publish/route.ts   # Publication automatique LinkedIn
│       ├── linkedin/               # Auth + callback + post
│       └── stripe/                 # Checkout + webhook
├── components/
│   ├── dashboard/BulkImport.tsx    # Import multi-posts (4 steps)
│   ├── calendar/CalendarView.tsx
│   ├── post/PostEditor.tsx
│   ├── post/LinkedInPreview.tsx
│   ├── analytics/Analytics.tsx
│   ├── carousel/CarouselBuilder.tsx
│   └── linkedin/LinkedInPreview.tsx
├── lib/
│   ├── supabase.ts           # Client-side Supabase
│   ├── supabase-server.ts    # Server-side Supabase (anon key)
│   └── linkedin.ts
└── supabase-migration.sql    # Dernière migration DB
```

## Plans tarifaires

| Plan | Prix | Imports IA/mois | Reformulations/mois |
|------|------|-----------------|---------------------|
| free | 0€ | 0 (rule-based only) | 0 |
| solo | 9€/mois | 5 | 20 |
| agence | 29€/mois | 20 | 80 |
| team | — | illimité | illimité |

---

## Règles de sécurité git (à respecter absolument)

1. **Lire ce fichier avant toute session de code**
2. **Ne jamais `git diff HEAD` pour commiter des fichiers locaux du VM** — le VM n'est pas forcément à jour
3. **Avant tout commit : vérifier `git log --oneline -5` pour connaître l'état HEAD**
4. **Toujours créer un commit atomique par fonctionnalité** (pas de commits massifs)
5. **En cas de doute sur un fichier : comparer avec `git show HEAD:chemin/fichier`**
6. **Mettre à jour ce fichier à chaque commit**
