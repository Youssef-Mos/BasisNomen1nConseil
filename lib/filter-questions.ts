/**
 * lib/filter-questions.ts — Configuration du parcours de questions guidées.
 *
 * Chaque question contient un intitulé et une liste de réponses possibles.
 * Chaque réponse associe :
 *   - des tags (utilisés pour filtrer les articles)
 *   - l'id de la question suivante (null = afficher les résultats)
 *
 * Pour ajouter de nouvelles questions : ajoutez une entrée dans `questions`
 * et référencez son id dans `nextQuestionId` d'une réponse existante.
 */

export type FilterAnswer = {
  id: string
  label: string
  /** Tags ajoutés aux tags accumulés quand l'utilisateur sélectionne cette réponse. */
  tags: string[]
  /** Id de la prochaine question, ou null pour afficher directement les résultats. */
  nextQuestionId: string | null
}

export type FilterQuestion = {
  id: string
  label: string
  answers: FilterAnswer[]
}

export type FilterQuestionsConfig = {
  /** Id de la première question à afficher. */
  firstQuestionId: string
  /** Table de correspondance id → question. */
  questions: Record<string, FilterQuestion>
}

export const filterQuestions: FilterQuestionsConfig = {
  firstQuestionId: "q-domaine",
  questions: {

    // ── Question 1 : domaine général ────────────────────────────────────────
    "q-domaine": {
      id: "q-domaine",
      label: "Dans quel domaine cherchez-vous une norme ?",
      answers: [
        {
          id: "a-construction",
          label: "Construction et bâtiment",
          tags: ["construction"],
          nextQuestionId: "q-construction",
        },
        {
          id: "a-electricite",
          label: "Électricité et énergie",
          tags: ["electricite"],
          nextQuestionId: "q-electricite",
        },
        {
          id: "a-securite",
          label: "Sécurité et protection",
          tags: ["securite"],
          nextQuestionId: "q-securite",
        },
        {
          id: "a-general",
          label: "Généralités et définitions",
          tags: ["general"],
          nextQuestionId: null,
        },
      ],
    },

    // ── Question 2a : construction ───────────────────────────────────────────
    "q-construction": {
      id: "q-construction",
      label: "Quel aspect de la construction vous intéresse ?",
      answers: [
        {
          id: "a-structure",
          label: "Structure et résistance mécanique",
          tags: ["structure"],
          nextQuestionId: null,
        },
        {
          id: "a-thermique",
          label: "Performance thermique et isolation",
          tags: ["thermique"],
          nextQuestionId: null,
        },
        {
          id: "a-acoustique",
          label: "Acoustique",
          tags: ["acoustique"],
          nextQuestionId: null,
        },
        {
          id: "a-facade",
          label: "Façades et enveloppe du bâtiment",
          tags: ["facade"],
          nextQuestionId: null,
        },
      ],
    },

    // ── Question 2b : électricité ────────────────────────────────────────────
    "q-electricite": {
      id: "q-electricite",
      label: "Quel type d'installation électrique ?",
      answers: [
        {
          id: "a-bt",
          label: "Basse tension (≤ 1 000 V)",
          tags: ["basse-tension"],
          nextQuestionId: null,
        },
        {
          id: "a-ht",
          label: "Haute tension (> 1 000 V)",
          tags: ["haute-tension"],
          nextQuestionId: null,
        },
        {
          id: "a-domotique",
          label: "Domotique et automatisation du bâtiment",
          tags: ["domotique"],
          nextQuestionId: null,
        },
      ],
    },

    // ── Question 2c : sécurité ───────────────────────────────────────────────
    "q-securite": {
      id: "q-securite",
      label: "Quel aspect de la sécurité ?",
      answers: [
        {
          id: "a-incendie",
          label: "Protection incendie",
          tags: ["incendie"],
          nextQuestionId: null,
        },
        {
          id: "a-mecanique",
          label: "Sécurité mécanique",
          tags: ["mecanique"],
          nextQuestionId: null,
        },
        {
          id: "a-travail",
          label: "Sécurité au travail",
          tags: ["travail"],
          nextQuestionId: null,
        },
      ],
    },
  },
}
