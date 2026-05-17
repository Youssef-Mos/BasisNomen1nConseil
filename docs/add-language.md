# Ajouter une nouvelle langue

## Vue d'ensemble

Le système supporte actuellement trois langues : **FR** (français), **EN** (anglais) et **NL** (néerlandais). Chaque rectangle stocke jusqu'à trois champs texte : `textFr`, `textEn`, `textNl`. L'interface explore affiche le champ approprié selon la langue choisie par l'utilisateur.

**Logique de fallback** (implémentée dans `components/explore/shared.ts`, fonction `getText`) :

| Langue sélectionnée | Ordre de fallback |
|---------------------|-------------------|
| FR | `textFr` → `textEn` → `textNl` → `""` |
| EN | `textEn` → `textFr` → `textNl` → `""` |
| NL | `textNl` → `textFr` → `textEn` → `""` |

Si le champ principal est vide, le premier fallback non vide est utilisé. Si les trois champs sont vides, une chaîne vide est retournée et aucun texte n'est affiché.

Cette procédure ajoute une quatrième langue. **Allemand (DE)** est utilisé comme exemple — remplacer `De`/`de`/`DE`/`textDe` par les équivalents pour toute autre langue.

---

## Architecture : deux couches

Ajouter une langue se fait en **deux temps** :

| Couche | Acteur | Action |
|--------|--------|--------|
| **Schéma & code** | Développeur | Ajoute la colonne Prisma, met à jour les types TypeScript, enregistre la langue dans `lib/languages.ts`, déploie. |
| **Activation runtime** | Admin | Ouvre `/admin/languages`, clique **Add Language**, choisit la langue dans le dropdown searchable, valide. |

L'admin ne tape **jamais** un code langue manuellement — il choisit dans une liste de 56 langues ISO 639-1 prédéfinies via une modale.

---

## Étape 1 — Schéma Prisma

Dans `prisma/schema.prisma`, ajouter un champ `String?` au modèle `Rectangle` :

```diff
 model Rectangle {
   // ... champs existants ...
   textFr      String?
   textEn      String?
   textNl      String?
+  textDe      String?
   // ...
 }
```

Puis exécuter la migration :

```bash
npx prisma migrate dev --name "add_language_de"
npx prisma generate
```

- `migrate dev` crée un fichier de migration dans `prisma/migrations/` et l'applique à la base locale.
- `generate` régénère le client Prisma pour que TypeScript reconnaisse le nouveau champ.

**Effet** : ajoute une colonne `"textDe" TEXT` nullable à la table `rectangles`. Les lignes existantes ont `NULL` pour cette colonne. **Aucune perte de données.**

---

## Étape 2 — Seed / backfill (optionnel)

Par défaut, tous les rectangles existants ont `textDe = null`. La logique de fallback (Étape 4) affichera automatiquement le français quand l'utilisateur sélectionnera DE.

Pour pré-remplir manuellement un rectangle via Prisma :

```ts
await prisma.rectangle.update({
  where: { id: "rect_id_here" },
  data: { textDe: "Deutscher Text" },
});
```

Ou en masse via SQL, en partant du français comme base de traduction :

```sql
UPDATE rectangles SET "textDe" = "textFr" WHERE "textDe" IS NULL;
```

Cette commande copie le texte français dans la nouvelle colonne — utile uniquement comme point de départ avant traduction réelle.

---

## Étape 3 — Types TypeScript

### `lib/types.ts`

Étendre `RectangleData`, `RectangleCreateInput` et `RectangleUpdateInput` :

```diff
 export type RectangleData = {
   // ... champs existants ...
   textFr: string | null;
   textEn: string | null;
   textNl: string | null;
+  textDe: string | null;
   // ...
 };

 export type RectangleCreateInput = {
   // ... champs existants ...
   textFr?: string | null;
   textEn?: string | null;
   textNl?: string | null;
+  textDe?: string | null;
 };

 export type RectangleUpdateInput = {
   // ... champs existants ...
   textFr?: string | null;
   textEn?: string | null;
   textNl?: string | null;
+  textDe?: string | null;
 };
```

---

## Étape 4 — Module partagé (`components/explore/shared.ts`)

Étendre `Lang`, `RectClient` et `getText` :

```diff
-export type Lang = "fr" | "en" | "nl";
+export type Lang = "fr" | "en" | "nl" | "de";

 export type RectClient = {
   // ... champs existants ...
   textFr: string | null;
   textEn: string | null;
   textNl: string | null;
+  textDe: string | null;
   // ...
 };

 export function getText(rect: RectClient, lang: Lang): string {
   if (lang === "en") return rect.textEn || rect.textFr || rect.textNl || "";
   if (lang === "nl") return rect.textNl || rect.textFr || rect.textEn || "";
+  if (lang === "de") return rect.textDe || rect.textFr || rect.textEn || "";
   return rect.textFr || rect.textEn || rect.textNl || "";
 }
```

L'ordre du fallback DE → FR → EN peut être adapté selon les besoins de traduction.

---

## Étape 5 — Enregistrer la langue dans `lib/languages.ts`

Le fichier `lib/languages.ts` est la **source de vérité unique** des langues que la modale d'admin propose. Si la langue cible n'y figure pas, l'ajouter :

```diff
 export const SUPPORTED_LANGUAGES = [
   { code: "fr", name: "French",   nativeName: "Français",   flag: "🇫🇷" },
   { code: "en", name: "English",  nativeName: "English",    flag: "🇬🇧" },
   { code: "nl", name: "Dutch",    nativeName: "Nederlands", flag: "🇳🇱" },
+  { code: "de", name: "German",   nativeName: "Deutsch",    flag: "🇩🇪" },
   // ...
 ] as const satisfies readonly Language[];
```

Les 56 langues ISO 639-1 les plus courantes sont déjà incluses — il est rare d'avoir à éditer ce fichier.

> **Note typage** : `LanguageCode` est inféré automatiquement par TypeScript via `(typeof SUPPORTED_LANGUAGES)[number]["code"]`. Aucun `any`, aucune liste à maintenir en double.

---

## Étape 6 — Activer la langue via l'interface admin

L'admin **n'écrit jamais** un code langue à la main. Toute l'activation passe par une modale.

### Parcours utilisateur

1. Aller sur **`/admin/languages`**.
2. Voir la **liste des langues actives** (FR, EN, NL au départ), chacune avec un toggle pour la désactiver.
3. Cliquer **Add Language** → la modale s'ouvre.
4. La modale affiche un **dropdown searchable** listant les 56 langues de `SUPPORTED_LANGUAGES`, avec **drapeau emoji + nom natif**.
5. Les langues **déjà actives** sont **grisées et non sélectionnables** dans le dropdown.
6. L'admin tape une recherche (ex. `"all"` → Allemand, `"deu"` → Deutsch), sélectionne **🇩🇪 Deutsch**, puis clique **Add**.
7. La langue apparaît dans la liste des actives, immédiatement visible dans le sélecteur de la vue explore.

### Comportement attendu de la modale

| Élément | Comportement |
|---------|--------------|
| Champ de recherche | Filtre la liste sur `name` et `nativeName` (insensible à la casse). |
| Langue déjà active | Rendue avec `opacity-50`, attribut `disabled`, tooltip "Already active". |
| Bouton **Add** | Désactivé tant qu'aucune langue n'est sélectionnée. |
| Bouton **Cancel** ou clic hors modale | Ferme sans modifier l'état. |
| Toggle dans la liste active | Désactive la langue (sans supprimer les colonnes ni les données). |

### Données côté serveur

L'ensemble des codes actifs peut être stocké :
- soit dans une table `app_settings` (clé `activeLanguages`, valeur `string[]`),
- soit dans une colonne d'une table `Norm` si l'activation est par norme.

Le sélecteur de l'explore lit cette source au montage et n'affiche que les langues actives présentes dans `SUPPORTED_LANGUAGES`.

### Squelette TypeScript (strict, sans `any`)

```tsx
import { SUPPORTED_LANGUAGES, type Language, type LanguageCode } from "@/lib/languages";

type AddLanguageModalProps = {
  activeCodes: readonly LanguageCode[];
  onAdd: (code: LanguageCode) => Promise<void>;
  onClose: () => void;
};

export function AddLanguageModal({ activeCodes, onAdd, onClose }: AddLanguageModalProps) {
  const [query, setQuery] = useState<string>("");
  const [selected, setSelected] = useState<LanguageCode | null>(null);

  const activeSet = new Set<LanguageCode>(activeCodes);
  const results: readonly Language[] = SUPPORTED_LANGUAGES.filter((lang) => {
    const q = query.toLowerCase();
    return lang.name.toLowerCase().includes(q) || lang.nativeName.toLowerCase().includes(q);
  });

  // ... rendu du dropdown searchable
}
```

---

## Étape 7 — Sélecteur de l'explore

Dans `components/explore/DocumentViewer.tsx`, remplacer la liste codée en dur par une lecture dynamique des langues actives :

```diff
-{(["fr", "en", "nl"] as Lang[]).map((l) => (
+{activeLanguages.map((l) => (
```

`activeLanguages` provient des settings (voir Étape 6). Pour chaque code, on récupère `Language` via `getLanguage(code)` pour afficher le drapeau :

```tsx
import { getLanguage } from "@/lib/languages";

const meta = getLanguage(l);
// meta?.flag, meta?.nativeName, ...
```

Le bouton continue de fonctionner sans drapeau si on préfère le rendu textuel existant.

---

## Étape 8 — Formulaire admin de rectangle

Dans `components/admin/PropertiesPanel.tsx`, ajouter un textarea pour la nouvelle langue à côté des FR/EN/NL existants.

### Variable d'état

```diff
 const [textNl, setTextNl] = useState("");
+const [textDe, setTextDe] = useState("");
```

### Initialisation dans le `useEffect` qui synchronise sur changement de rectangle

```diff
 setTextNl(rectangle.textNl || "");
+setTextDe(rectangle.textDe || "");
```

(Penser à le faire dans **les deux** branches — "même rectangle mis à jour" et "rectangle différent sélectionné".)

### Bloc textarea — à insérer juste après le textarea NL

```tsx
<div>
  <label className="block text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1.5">
    Text (DE)
  </label>
  <textarea
    value={textDe}
    onChange={(e) => setTextDe(e.target.value)}
    rows={3}
    className="w-full px-3 py-2 border border-(--border-default) rounded-md text-sm bg-(--bg-surface) text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-y"
  />
</div>
```

### Inclusion dans `handleSave`

```diff
 const result = await onUpdate(rectangle!.id, {
   // ... champs existants ...
   textFr: textFr || null,
   textEn: textEn || null,
   textNl: textNl || null,
+  textDe: textDe || null,
 });
```

---

## Étape 9 — Routes API

### `app/api/documents/[id]/rectangles/route.ts` — handler `POST`

```diff
-const { fatherId, type, labels, textFr, textEn, textNl, page, x, y, width, height } = body;
+const { fatherId, type, labels, textFr, textEn, textNl, textDe, page, x, y, width, height } = body;
```

```diff
 data: {
   // ...
   textFr: textFr || null,
   textEn: textEn || null,
   textNl: textNl || null,
+  textDe: textDe || null,
   // ...
 },
```

### `app/api/documents/[id]/rectangles/route.ts` — handler `GET` (recherche texte)

Ajouter le nouveau champ à la clause `OR` pour que le contenu allemand soit indexé par les filtres mots-clés :

```diff
 { textFr: { contains: textSearch, mode: "insensitive" } },
 { textEn: { contains: textSearch, mode: "insensitive" } },
 { textNl: { contains: textSearch, mode: "insensitive" } },
+{ textDe: { contains: textSearch, mode: "insensitive" } },
```

### `app/api/rectangles/[id]/route.ts` — handler `PUT`

```diff
-const { fatherId, type, labels, textFr, textEn, textNl, page, x, y, width, height } = body;
+const { fatherId, type, labels, textFr, textEn, textNl, textDe, page, x, y, width, height } = body;
```

```diff
 if (textNl !== undefined) data.textNl = textNl;
+if (textDe !== undefined) data.textDe = textDe;
```

### `app/explore/[id]/page.tsx` — clause `select`

Si un `select` Prisma explicite est utilisé, y ajouter `textDe: true` :

```diff
 select: {
   // ...
   textFr: true,
   textEn: true,
   textNl: true,
+  textDe: true,
   labels: true,
   fatherId: true,
 },
```

---

## Étape 10 — Test

1. Ouvrir l'éditeur admin (`/admin/documents/{id}`), sélectionner un rectangle.
2. Vérifier qu'un textarea **Text (DE)** apparaît dans le panneau Propriétés.
3. Saisir un texte allemand, cliquer **Save Changes**.
4. Aller sur **`/admin/languages`**, cliquer **Add Language**, chercher "german", sélectionner **🇩🇪 Deutsch**, cliquer **Add**.
5. Aller sur `/explore/{id}` — le sélecteur de langues affiche désormais **DE**.
6. Sélectionner **DE** — le texte allemand du rectangle s'affiche.
7. Effacer `textDe` pour un rectangle, sauver, revenir sur l'explore en DE — vérifier que le **fallback vers FR** est appliqué.
8. Lancer une recherche par mot-clé sur un texte allemand — vérifier qu'il est trouvé.
9. Sur `/admin/languages`, désactiver DE via le toggle — vérifier que DE disparaît du sélecteur de l'explore (les données restent intactes en base).

---

## Comportement de fallback

Implémenté dans `components/explore/shared.ts`, fonction `getText`.

| Condition | Ce qui est affiché |
|-----------|--------------------|
| Le champ de la langue sélectionnée est non vide | Son contenu |
| Le champ de la langue sélectionnée est vide | Premier fallback non vide (FR en premier pour toutes les langues sauf FR elle-même) |
| Tous les champs texte sont vides | Chaîne vide — aucun texte affiché |

Pour ajuster l'ordre de fallback d'une langue, éditer la ligne `return` correspondante. Exemple : faire que DE retombe sur EN avant FR :

```diff
-if (lang === "de") return rect.textDe || rect.textFr || rect.textEn || "";
+if (lang === "de") return rect.textDe || rect.textEn || rect.textFr || "";
```

---

## Checklist

### Côté développeur (code)

- [ ] `prisma/schema.prisma` — `textDe String?` ajouté au modèle `Rectangle`
- [ ] Migration : `npx prisma migrate dev --name "add_language_de"`
- [ ] Client regénéré : `npx prisma generate`
- [ ] (optionnel) Seed / backfill via Prisma ou SQL
- [ ] `lib/types.ts` — `textDe` ajouté à `RectangleData`, `RectangleCreateInput`, `RectangleUpdateInput`
- [ ] `components/explore/shared.ts` — `Lang` étendu, `textDe` dans `RectClient`, `getText` mis à jour
- [ ] `lib/languages.ts` — entrée présente dans `SUPPORTED_LANGUAGES` (déjà le cas pour les 56 langues principales)
- [ ] `components/explore/DocumentViewer.tsx` — sélecteur lit `activeLanguages` au lieu de la liste codée en dur
- [ ] `components/admin/PropertiesPanel.tsx` — état, textarea, sync `useEffect`, `handleSave` mis à jour
- [ ] `app/api/documents/[id]/rectangles/route.ts` (POST) — `textDe` dans destructuring + create data
- [ ] `app/api/documents/[id]/rectangles/route.ts` (GET) — `textDe` dans la clause `OR` de recherche texte
- [ ] `app/api/rectangles/[id]/route.ts` (PUT) — `textDe` dans destructuring + update data
- [ ] `app/explore/[id]/page.tsx` — `textDe` dans le `select` Prisma si explicite

### Côté admin (runtime)

- [ ] Page `/admin/languages` accessible
- [ ] Modale **Add Language** : dropdown searchable, 56 langues, drapeaux emoji
- [ ] Langues actives grisées et non sélectionnables
- [ ] Bouton **Add** désactivé tant qu'aucune sélection
- [ ] Liste des actives avec toggle de désactivation
- [ ] Aucune saisie manuelle de code possible

### Tests

- [ ] DE saisi en admin → visible dans `/explore` avec DE sélectionné
- [ ] Fallback vers FR quand `textDe` vide
- [ ] Recherche par mot-clé trouve le texte allemand
- [ ] Désactiver DE retire la langue du sélecteur sans perte de données
