// ============================================
// Templates de posts LinkedIn
// ============================================

export interface PostTemplate {
  title: string
  content: string
  category: string
}

export const defaultTemplates: PostTemplate[] = [
  {
    category: 'Storytelling',
    title: 'Histoire personnelle',
    content: `Il y a [durée], j'ai [situation de départ].

Personne ne croyait que [défi].

Mais voilà ce qui s'est passé :

1️⃣ [Premier tournant]
2️⃣ [Deuxième tournant]
3️⃣ [Résultat inattendu]

Aujourd'hui, [situation actuelle].

La leçon ? [Leçon clé en une phrase].

Si tu traverses [situation similaire], rappelle-toi : [message d'espoir].

Quelle est ta plus grande leçon cette année ? 👇`,
  },
  {
    category: 'Tips & Valeur',
    title: '5 conseils rapides',
    content: `5 [sujets] que j'aurais aimé connaître plus tôt :

1. [Conseil 1]
→ [Explication courte]

2. [Conseil 2]
→ [Explication courte]

3. [Conseil 3]
→ [Explication courte]

4. [Conseil 4]
→ [Explication courte]

5. [Conseil 5]
→ [Explication courte]

Lequel résonne le plus avec toi ? 💬`,
  },
  {
    category: 'Engagement',
    title: 'Question polarisante',
    content: `Unpopular opinion :

[Affirmation controversée mais réfléchie].

Voici pourquoi je pense ça :

[Argument 1]
[Argument 2]
[Argument 3]

Je sais que beaucoup ne seront pas d'accord.

Et c'est exactement le point.

D'accord ou pas d'accord ? Dis-moi pourquoi 👇`,
  },
  {
    category: 'Carrousel',
    title: 'Avant / Après',
    content: `❌ Ce que je faisais AVANT :
[Mauvaise habitude/méthode]

✅ Ce que je fais MAINTENANT :
[Bonne habitude/méthode]

Le résultat ?
[Résultat concret avec chiffres si possible]

Le changement n'a pas été facile, mais il en valait la peine.

Voici les 3 étapes qui ont tout changé :

Étape 1 : [Action]
Étape 2 : [Action]
Étape 3 : [Action]

Tu veux les détails ? Commente "GO" et je t'explique 🚀`,
  },
  {
    category: 'Personnel',
    title: 'Leçon du lundi',
    content: `Ce lundi, je me rappelle une chose :

[Leçon ou réflexion profonde]

La semaine dernière, j'ai [expérience récente].

Ça m'a rappelé que [insight].

Cette semaine, mon objectif est simple :
→ [Objectif 1]
→ [Objectif 2]
→ [Objectif 3]

Et toi, quel est ton objectif cette semaine ? 🎯`,
  },
]
