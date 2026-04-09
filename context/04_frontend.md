# Frontend — Composants et Pages

## Pages (App Router)

### `/` → redirect → `/explore`
Géré dans `middleware.ts`.

### `/explore` (public)
Liste des documents. Server Component.

### `/explore/[id]` (public)
- Server Component : charge `Document` + tous ses `Rectangle` depuis Prisma directement
- Passe à `<DocumentViewer doc={doc} rectangles={rectangles} />`
- `export const dynamic = "force-dynamic"` (pas de cache)

### `/admin` (protégé JWT)
- Dashboard admin, liste des documents
- Upload PDF via formulaire

### `/admin/login`
- Page OTP : saisie code → `POST /api/admin/verify-otp`

### `/admin/[id]` (protégé JWT)
- Éditeur PDF complet
- Charge le document, rend les pages, mode annotation

## Composants Admin

### `PdfEditor`
Composant racine de l'éditeur. Orchestre :
- Navigation page (prev/next)
- Mode de dessin actif (select / fullWidth / freeRect)
- Rectangle sélectionné
- Appels API (create, update, delete)

### `PdfCanvas`
Canvas interactif pour afficher une page PNG et dessiner/sélectionner des rectangles.
- Affiche les rectangles existants (colorés par type)
- Gère les événements souris pour les 3 modes
- Handles de resize sur le rectangle sélectionné

### `ToolBar`
Boutons de navigation page + switch de mode (Select/FullWidth/FreeRect).
Raccourcis clavier : `V` (select), `F` (fullWidth), `R` (freeRect), `Esc`.

### `PropertiesPanel`
Panneau droit : édition des métadonnées du rectangle sélectionné.
- Type, fatherId (via ParentSelector), labels, textFr/En/Nl
- Bouton "Save Changes" → PUT /api/rectangles/:id
- Bouton "Delete Rectangle" → DELETE

### `ParentSelector`
Dropdown pour choisir le rectangle parent dans le même document.

### `DocumentList`
Liste les documents uploadés avec statistiques (rectangleCount, pageCount).

## Composants Explore

### `DocumentViewer`
Composant principal explore. Reçoit `doc` + `rectangles[]`.
Gère :
- Affichage des résultats (liste ou grille)
- Filtres via FilterSidebar
- Sélection d'un rectangle → Lightbox

### `FilterSidebar`
Filtres latéraux : mots-clés, labels (topic, buildingHeight, etc.), page PDF.

### `ResultCard`
Carte d'un rectangle : type, labels hérités, texte, miniature crop.

### `TreeNode`
Affichage hiérarchique (arbre) des rectangles avec leurs enfants.

### `RectCrop`
Image du crop d'un rectangle. Src : `/api/crop/{rectId}`.

### `Lightbox`
Overlay pour afficher le détail d'un rectangle sélectionné (crop + texte multilingue).

## Thème / CSS

- Variables CSS dans `globals.css` pour light/dark mode
- Toggle thème : composant `ThemeToggle` dans le layout
- Pas de couleurs hardcodées — tout passe par `var(--couleur)`
- Script dans `layout.tsx` pour éviter le flash de mauvais thème au chargement

## lib/api.ts
Fonctions fetch client-side (wrappers sur les routes API).
Toujours utiliser ces fonctions depuis les composants, pas de fetch raw.

## lib/hooks/
React hooks custom (ex: usePdfEditor, useRectangles...).
