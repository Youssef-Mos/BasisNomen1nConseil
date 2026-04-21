# Filtres dynamiques — Architecture et utilisation

## Vue d'ensemble

La vue explore (`/explore/{id}`) dispose d'une barre latérale de filtres permettant de restreindre les rectangles affichés dans un document. Les filtres sont **entièrement pilotés par la base de données** et **gérables par un administrateur depuis l'interface** — aucune modification de code n'est nécessaire pour ajouter, modifier ou supprimer un filtre.

Les définitions de filtres sont stockées dans la table `norm_filters`. Chaque filtre peut être :
- **Associé à une norme spécifique** — visible uniquement pour les documents de cette norme.
- **Global (sans norme)** — visible pour **tous** les documents.

---

## Partie 1 — Fonctionnement du système

### Architecture générale

```
Admin UI (/admin/filters)          Base de données (norm_filters)      Vue Explore (/explore/:docId)

 Créer / Modifier / Supprimer ──>  Lignes NormFilter            ──>  FilterSidebar rendu dynamique
 Choisir : norme spécifique        normId = null  → global            récupère global + spécifique
           ou "Toutes les normes"  normId = "xyz" → norme seule
                                                                      L'utilisateur applique les filtres
                                                                           │
                                                                           ▼
                                                                GET /api/documents/:id/rectangles
                                                                  lit norm_filters, applique chacun
```

### Modèle de données : `NormFilter`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | `String` (cuid) | Clé primaire |
| `normId` | `String?` | Clé étrangère vers `norms`. **null = s'applique à toutes les normes (global).** |
| `key` | `String` | Nom du paramètre de requête (ex. `buildingHeightType`). Unique par portée. |
| `label` | `String` | Libellé affiché dans la barre latérale (ex. "Type de hauteur") |
| `section` | `String` | Regroupement dans l'interface (ex. "Bâtiment"). Même section = même carte. |
| `type` | `String` | Un parmi : `select`, `text`, `multiselect`, `boolean`, `number`, `range` |
| `options` | `String[]` | Pour `select`/`multiselect` : valeurs autorisées. Pour `number`/`range` : configuration (voir ci-dessous). Ignoré sinon. |
| `sortOrder` | `Int` | Ordre d'affichage (croissant). Plus petit = plus haut dans la barre. |
| `createdAt` | `DateTime` | Défini automatiquement à la création |

---

## Partie 2 — Types de filtres disponibles

### Tableau récapitulatif

| Type | Contrôle UI | Comment il filtre | Personnalisation |
|------|-------------|-------------------|------------------|
| `select` | Menu déroulant avec options définies | Correspondance de label : les labels effectifs du rectangle doivent contenir la valeur sélectionnée | Options libres, ordre personnalisable |
| `text` | Champ texte libre | Recherche `contains` insensible à la casse sur `textFr`, `textEn`, `textNl` | Placeholder personnalisable via le label |
| `multiselect` | Cases à cocher, une par option | Les labels effectifs doivent contenir **toutes** les valeurs cochées (ET logique) | Options libres, nombre illimité |
| `boolean` | Menu déroulant à 3 états : Tous / Oui / Non | "Oui" = labels effectifs contiennent le `label` du filtre. "Non" = ne le contiennent PAS. | Aucune option nécessaire |
| `number` | Champ numérique avec min/max/pas | Filtre sur une valeur numérique extraite des labels | Min, max, pas, unité (voir section dédiée) |
| `range` | Double curseur (slider) min–max | Filtre sur une plage numérique dans les labels | Min, max, pas, unité (voir section dédiée) |

### Filtres intégrés (toujours présents, hors base de données)

Deux filtres sont toujours affichés :

1. **Mots-clés** (`search`) — recherche texte libre sur `textFr/En/Nl`
2. **Sujet** (`topic`) — menu déroulant peuplé depuis tous les labels uniques du document

Ces filtres sont codés en dur dans `FilterSidebar.tsx` dans la section "Recherche" car ils sont universels.

### Héritage de labels

Le filtrage utilise les **labels hérités** : labels effectifs d'un rectangle = ses propres `labels` + ceux de tous ses ancêtres (récursif, via `lib/labels.ts`).

Taguer une section parente avec `"Immeuble élevé (> 25 m)"` rend automatiquement tous ses enfants éligibles à ce filtre.

---

## Partie 3 — Filtres numériques (personnalisation avancée)

Les types `number` et `range` permettent de filtrer des données quantitatives sans écrire de code. Ils utilisent le champ `options` pour stocker leur configuration.

### Type `number` — Valeur numérique exacte

**Cas d'usage** : filtrer par nombre d'étages, surface, capacité, etc.

#### Configuration via `options`

Le champ `options` stocke les paramètres sous forme de paires `clé:valeur` :

| Paramètre | Format | Description | Obligatoire | Exemple |
|-----------|--------|-------------|-------------|---------|
| `min` | `min:0` | Valeur minimale autorisée | Non (défaut: aucune limite) | `min:0` |
| `max` | `max:100` | Valeur maximale autorisée | Non (défaut: aucune limite) | `max:50` |
| `step` | `step:1` | Incrément du champ | Non (défaut: `1`) | `step:0.5` |
| `unit` | `unit:m²` | Unité affichée à côté du champ | Non (défaut: aucune) | `unit:m` |
| `operator` | `operator:gte` | Opérateur de comparaison | Non (défaut: `eq`) | `operator:lte` |

**Opérateurs disponibles** :

| Opérateur | Signification | Exemple |
|-----------|---------------|---------|
| `eq` | Égal à | Surface = 50 m² |
| `gte` | Supérieur ou égal à | Hauteur >= 25 m |
| `lte` | Inférieur ou égal à | Étages <= 5 |
| `gt` | Strictement supérieur à | Capacité > 100 |
| `lt` | Strictement inférieur à | Distance < 10 m |

#### Exemple : créer un filtre "Nombre d'étages"

1. Aller sur `/admin/filters`, cliquer **Nouveau filtre**.
2. **Norme** : sélectionner "NBN S21-201" (ou "Toutes les normes" pour global).
3. **Clé** : `floorCount`
4. **Label** : "Nombre d'étages"
5. **Section** : "Bâtiment"
6. **Type** : `number`
7. **Options** : `min:0, max:60, step:1, unit:étages, operator:lte`
8. **Ordre** : `15`
9. Cliquer **Créer le filtre**.

L'utilisateur verra un champ numérique avec un pas de 1, un min de 0 et un max de 60, avec l'unité "étages" affichée. Le filtre montrera les rectangles dont le label numérique est inférieur ou égal à la valeur saisie.

### Type `range` — Plage numérique (min–max)

**Cas d'usage** : filtrer une surface entre deux bornes, une hauteur dans un intervalle, etc.

#### Configuration via `options`

Même format que `number`, avec deux paramètres supplémentaires :

| Paramètre | Format | Description | Obligatoire | Exemple |
|-----------|--------|-------------|-------------|---------|
| `min` | `min:0` | Borne minimale du curseur | Oui | `min:0` |
| `max` | `max:1000` | Borne maximale du curseur | Oui | `max:500` |
| `step` | `step:10` | Incrément du curseur | Non (défaut: `1`) | `step:5` |
| `unit` | `unit:m²` | Unité affichée | Non | `unit:m²` |

#### Exemple : créer un filtre "Surface" en plage

1. **Clé** : `surfaceRange`
2. **Label** : "Surface"
3. **Section** : "Dimensions"
4. **Type** : `range`
5. **Options** : `min:0, max:1000, step:10, unit:m²`
6. **Ordre** : `20`

L'utilisateur verra un double curseur permettant de sélectionner une plage (ex. 50 m² – 200 m²).

### Comment les filtres numériques matchent les labels

Les filtres `number` et `range` extraient la valeur numérique depuis les labels des rectangles en cherchant un nombre dans le label correspondant au filtre. Par exemple :

- Label `"5 étages"` → valeur extraite : `5`
- Label `"Surface: 120 m²"` → valeur extraite : `120`
- Label `"Hauteur 25.5 m"` → valeur extraite : `25.5`

Le système extrait le premier nombre trouvé dans un label qui contient le mot-clé du label du filtre.

---

## Partie 4 — Personnalisation complète (99% sans code)

### Ce qui est personnalisable sans toucher au code

| Aspect | Comment personnaliser | Où |
|--------|----------------------|-----|
| **Ajouter un filtre** | Créer via `/admin/filters` | Admin UI |
| **Supprimer un filtre** | Supprimer via `/admin/filters` | Admin UI |
| **Modifier le libellé** | Éditer le champ `label` | Admin UI |
| **Changer la section** | Éditer le champ `section` | Admin UI |
| **Réordonner les filtres** | Modifier `sortOrder` | Admin UI |
| **Changer le type** | Modifier `type` (select → multiselect, etc.) | Admin UI |
| **Modifier les options** | Éditer la liste d'options | Admin UI |
| **Portée norme / global** | Changer `normId` | Admin UI |
| **Ajouter une section** | Utiliser un nouveau nom de section — affiché automatiquement | Admin UI |
| **Config numérique** | Min/max/pas/unité via le champ options | Admin UI |
| **Labels des rectangles** | Taguer via l'éditeur de rectangles admin | Admin UI |
| **Héritage de labels** | Taguer le rectangle parent — les enfants héritent | Admin UI |

### Ce qui nécessite du code (1%)

| Aspect | Pourquoi |
|--------|----------|
| **Nouveau type de filtre** | Nécessite un rendu UI + logique backend (voir Partie 6) |
| **Modifier les filtres intégrés** (mots-clés, sujet) | Codés en dur dans `FilterSidebar.tsx` |
| **Changer la logique de combinaison** (ET → OU) | Logique serveur dans `rectangles/route.ts` |

### Stratégies de personnalisation avancées

#### Simuler un filtre "intervalle" avec multiselect

Si le type `range` n'est pas encore implémenté dans le code, on peut simuler un filtre d'intervalle :

1. Créer un filtre `multiselect` avec des options prédéfinies :
   - Options : `0-10 m², 10-50 m², 50-100 m², 100-500 m², > 500 m²`
2. Taguer les rectangles avec la tranche correspondante.
3. L'utilisateur coche les tranches qui l'intéressent.

#### Filtres conditionnels par norme

Créer des filtres spécifiques à chaque norme permet d'adapter la barre latérale au contexte :

- **NBN S21-201** (sécurité incendie) : filtres "Résistance au feu", "Compartimentage"
- **NBN B03-004** (acoustique) : filtres "Isolation acoustique", "Niveau sonore"
- **Global** : filtres "Contient figure", "Langue du texte"

#### Hiérarchie via les sections

Les sections regroupent visuellement les filtres. Utiliser des noms cohérents :

| Section | Filtres typiques |
|---------|-----------------|
| Bâtiment | Type de hauteur, nombre d'étages, surface |
| Sécurité | Résistance au feu, catégorie de compartiment |
| Contenu | Contient figure, langue, type de rectangle |
| Dimensions | Surface, hauteur, largeur |

---

## Partie 5 — Gestion des filtres (interface admin)

### Accéder à la page de gestion

1. Aller sur `/admin`.
2. Cliquer **Filters** dans la barre de navigation.
3. Vous arrivez sur `/admin/filters` — un tableau de tous les filtres.

### Créer un filtre

1. Cliquer **New filter**.
2. Remplir le formulaire :
   - **Norm** : choisir une norme ou "All norms (global)".
   - **Key** : identifiant unique (ex. `buildingHeightType`). camelCase, sans espaces.
   - **Label** : nom affiché (ex. "Type de hauteur").
   - **Section** : regroupement UI (ex. "Bâtiment").
   - **Type** : `select`, `text`, `multiselect`, `boolean`, `number` ou `range`.
   - **Options** :
     - Pour `select`/`multiselect` : valeurs séparées par des virgules.
     - Pour `number`/`range` : paramètres `min:X, max:Y, step:Z, unit:U` (voir Partie 3).
     - Pour `text`/`boolean` : laisser vide.
   - **Sort order** : nombre pour l'ordre d'affichage.
3. Cliquer **Create filter**.

Le filtre est immédiatement disponible dans la vue explore.

### Modifier un filtre

Cliquer **Edit**, modifier les champs, cliquer **Update filter**. Changements immédiats.

### Supprimer un filtre

Cliquer **Delete**, confirmer. Le filtre disparaît. Les labels des rectangles ne sont pas affectés.

### Faire fonctionner un filtre : taguer les rectangles

Pour qu'un filtre retourne des résultats, les rectangles doivent avoir les labels correspondants :

- **`select` / `multiselect`** : les labels (ou hérités) doivent contenir la chaîne exacte de l'option.
- **`boolean`** : les labels doivent contenir la chaîne du `label` du filtre (pour que "Oui" matche).
- **`text`** : aucun label nécessaire — recherche directement dans le contenu texte.
- **`number` / `range`** : les labels doivent contenir une valeur numérique associée au filtre.

---

## Partie 6 — Modifier le code (pour développeurs)

### Référence des fichiers

| Fichier | Rôle |
|---------|------|
| `prisma/schema.prisma` | Modèle `NormFilter` (normId nullable) |
| `app/api/filters/route.ts` | `GET` (lister) et `POST` (créer) |
| `app/api/filters/[filterId]/route.ts` | `PUT` (modifier) et `DELETE` (supprimer) |
| `app/api/norms/[normId]/filters/route.ts` | `GET` filtres d'une norme (inclut les globaux) |
| `app/admin/filters/page.tsx` | Interface admin — tableau + formulaire |
| `components/explore/FilterSidebar.tsx` | Rendu dynamique, types (`FilterState`, `NormFilterDef`) |
| `components/explore/DocumentViewer.tsx` | Récupère les définitions au montage, construit les paramètres |
| `app/api/documents/[id]/rectangles/route.ts` | Application serveur des filtres (lit `norm_filters` dynamiquement) |
| `lib/labels.ts` | Héritage récursif de labels |

### Ajouter un nouveau type de filtre

Pour ajouter un type au-delà de ceux existants (ex. `date`, `color`) :

#### Étape 1 — Rendu dans FilterSidebar

Ajouter un `case` dans `renderFilterField` dans `components/explore/FilterSidebar.tsx` :

```tsx
case "number": {
  const config = parseNumberConfig(def.options);
  return (
    <Field key={def.key} label={`${def.label}${config.unit ? ` (${config.unit})` : ""}`}>
      <input
        type="number"
        value={(val as string) ?? ""}
        onChange={(e) => onChange(def.key, e.target.value)}
        min={config.min}
        max={config.max}
        step={config.step}
        className={INPUT}
      />
    </Field>
  );
}

case "range": {
  const config = parseNumberConfig(def.options);
  const [minVal, maxVal] = parseRangeValue(val as string, config);
  return (
    <Field key={def.key} label={`${def.label}${config.unit ? ` (${config.unit})` : ""}`}>
      <div className="flex gap-2 items-center">
        <input type="number" value={minVal} min={config.min} max={config.max} step={config.step}
          onChange={(e) => onChange(def.key, `${e.target.value}-${maxVal}`)} className={INPUT} />
        <span className="text-sm text-muted">—</span>
        <input type="number" value={maxVal} min={config.min} max={config.max} step={config.step}
          onChange={(e) => onChange(def.key, `${minVal}-${e.target.value}`)} className={INPUT} />
      </div>
    </Field>
  );
}
```

Fonction utilitaire pour parser la config :

```tsx
function parseNumberConfig(options: string[]): { min?: number; max?: number; step: number; unit: string; operator: string } {
  const config = { step: 1, unit: "", operator: "eq" } as any;
  for (const opt of options) {
    const [k, v] = opt.split(":").map(s => s.trim());
    if (k === "min" || k === "max" || k === "step") config[k] = Number(v);
    else if (k === "unit" || k === "operator") config[k] = v;
  }
  return config;
}
```

#### Étape 2 — Logique serveur de filtrage

Ajouter dans `app/api/documents/[id]/rectangles/route.ts`, dans la boucle `for (const def of filterDefs)` :

```ts
case "number": {
  const numVal = Number(paramVal);
  if (!Number.isFinite(numVal)) break;
  const config = parseNumberConfig(def.options);
  // Le filtrage numérique utilise les labels contenant des nombres
  numericFilters.push({ label: def.label, value: numVal, operator: config.operator });
  break;
}

case "range": {
  const [minStr, maxStr] = paramVal.split("-");
  const minVal = Number(minStr), maxVal = Number(maxStr);
  if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) break;
  numericFilters.push({ label: def.label, min: minVal, max: maxVal });
  break;
}
```

#### Étape 3 — Validation

Ajouter les nouveaux types dans le tableau `validTypes` de :
- `app/api/filters/route.ts`
- `app/api/filters/[filterId]/route.ts`
- `app/api/norms/[normId]/filters/route.ts`

```ts
const validTypes = ["select", "text", "multiselect", "boolean", "number", "range"];
```

#### Étape 4 — Formulaire admin

Ajouter dans `FILTER_TYPES` dans `app/admin/filters/page.tsx` :

```ts
const FILTER_TYPES = ["select", "text", "multiselect", "boolean", "number", "range"] as const;
```

Et ajouter une condition pour afficher le champ options pour les types numériques :

```ts
const showOptions = form.type === "select" || form.type === "multiselect"
  || form.type === "number" || form.type === "range";
```

#### Étape 5 — Tester

1. Créer un filtre de type `number` ou `range` via `/admin/filters`.
2. Ouvrir un document dans la vue explore.
3. Vérifier le rendu et le fonctionnement.
4. Combiner avec d'autres filtres pour vérifier la logique ET.

---

## Référence API

### Gestion des filtres

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/filters` | `GET` | Lister tous les filtres. Optionnel `?normId=...`. |
| `/api/filters` | `POST` | Créer un filtre. Corps : `{ normId, key, label, section, type, options, sortOrder }` |
| `/api/filters/{filterId}` | `PUT` | Modifier un filtre. Corps : mêmes champs, tous optionnels. |
| `/api/filters/{filterId}` | `DELETE` | Supprimer un filtre. |
| `/api/norms/{normId}/filters` | `GET` | Filtres d'une norme (inclut les globaux). |

### Application des filtres (vue explore)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/documents/{id}/rectangles` | `GET` | Rectangles filtrés. Params : `keywords`, `topic`, + clés dynamiques. Pagination : `page`, `pageSize`. |

### Exemples d'appels API

**Créer un filtre numérique** :
```bash
curl -X POST /api/filters \
  -H "Content-Type: application/json" \
  -d '{
    "normId": null,
    "key": "floorCount",
    "label": "Nombre d étages",
    "section": "Bâtiment",
    "type": "number",
    "options": ["min:0", "max:60", "step:1", "unit:étages", "operator:lte"],
    "sortOrder": 15
  }'
```

**Créer un filtre plage** :
```bash
curl -X POST /api/filters \
  -H "Content-Type: application/json" \
  -d '{
    "normId": "clxx123",
    "key": "surfaceRange",
    "label": "Surface",
    "section": "Dimensions",
    "type": "range",
    "options": ["min:0", "max:1000", "step:10", "unit:m²"],
    "sortOrder": 20
  }'
```

---

## Script de seed

Le script `scripts/seed-filters.ts` migre les filtres précédemment codés en dur dans la table `norm_filters`. Utilise `upsert`, donc peut être exécuté plusieurs fois sans risque.

```bash
npx tsx scripts/seed-filters.ts
```
