# Conventions et règles du projet

## Conventions de code

### TypeScript
- Strict mode activé
- Types partagés dans `lib/types.ts` — toujours les utiliser, jamais inline
- `RectangleData`, `DocumentListItem`, `RectangleCreateInput`, etc. sont les types canoniques
- Pas de `any` sauf dans les filtres Prisma dynamiques (accepté localement)

### Next.js App Router
- Pages serveur = async components qui fetchent directement via Prisma
- Pages client = `"use client"` explicite en haut du fichier
- `export const dynamic = "force-dynamic"` sur les pages qui ne doivent pas être cachées
- params dans App Router = `Promise<{...}>` → toujours `await params`

### API Routes
- Pattern : `RouteContext = { params: Promise<{ id: string }> }`
- Toujours `await context.params` avant utilisation
- Réponses d'erreur : `NextResponse.json({ error: "message" }, { status: XXX })`
- Réponses success : `NextResponse.json(data)` ou `NextResponse.json(data, { status: 201 })`

### Prisma
- Instance singleton dans `lib/prisma.ts` — jamais `new PrismaClient()` ailleurs
- Toujours utiliser `select` ou `include` explicitement, jamais de select * implicite
- Les dates retournées en JSON : toujours `.toISOString()`

### Coordonnées rectangles
- **Toujours en pourcentage (0–100)** — jamais en pixels dans la BDD
- x=0 = bord gauche, x=100 = bord droit
- y=0 = haut de page, y=100 = bas de page
- Overlap check : AABB (Axis-Aligned Bounding Box)

## Pièges connus

### Overlap false positives
Le check d'overlap compare avec `r.x + r.width` et `r.y + r.height`. Si un rectangle
est exactement adjacent (même bord), il ne compte pas comme overlap (condition stricte `<`).

### Crop après géométrie
Lors d'un PUT qui change la géométrie : `textFr` est re-extrait par OCR **seulement si**
l'appelant n'a pas fourni `textFr` explicitement dans le body. Si on veut forcer le texte
manuel, il faut l'envoyer dans le body.

### render_pages.py bloquant
L'upload attend la fin du rendu des pages. Pour un grand PDF, ça peut prendre plusieurs minutes.
Ne pas modifier en async sans prévoir un mécanisme de polling côté client.

### Thème dark/light
Tout est en variables CSS (`var(--background)`, etc.). Ne jamais hardcoder de couleur Tailwind
directement (`bg-white`, `text-gray-900`) dans les composants — utiliser les classes qui
utilisent les variables, ou des classes conditionnelles `dark:`.

## Structure de labels (domaine métier)

Les labels sont des strings libres mais dans la pratique ils encodent :
- `topic` : sujet (ex: "évacuation", "résistance au feu")
- `buildingHeightType` : type de bâtiment par hauteur
- `compartmentCategory` : catégorie de compartiment
- `roomCategory` : type de local

Les filtres de l'explore side utilisent ces labels via `Prisma.labels.has()`.

## Scripts npm utiles

```bash
npm run dev              → démarrage dev (localhost:3000)
npm run prisma:generate  → régénère le client Prisma
npm run prisma:migrate   → applique les migrations
npm run prisma:studio    → interface BDD graphique (localhost:5555)
npm run build            → build production
```

## Git

- Branche principale : `main`
- Branche de travail courante : `JALON1BIS`
- Ne jamais commit : uploads/, public/pdf-pages/, .env*, context/, CLAUDE.md
