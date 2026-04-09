# Base de données — Schéma Prisma

## Entités

### Document
```
id          String   @id @default(cuid())
title       String
pdfPath     String               → chemin relatif : uploads/pdfs/{hash}.pdf
fileHash    String   @unique     → SHA-256 du PDF (anti-doublon)
pageCount   Int      @default(0)
createdAt   DateTime
updatedAt   DateTime
rectangles  Rectangle[]
```

### Rectangle (entité CŒUR)
```
id          String        @id @default(cuid())
documentId  String        → FK Document (cascade delete)
fatherId    String?       → FK Rectangle? (auto-référence, SetNull on delete)
type        RectangleType @default(paragraph)
labels      String[]      → tags de classification
textFr      String?       → texte français
textEn      String?       → texte anglais
textNl      String?       → texte néerlandais
page        Int           → numéro de page (1-indexé)
x           Float         → % depuis bord gauche (0-100)
y           Float         → % depuis bord haut (0-100)
width       Float         → % de largeur page
height      Float         → % de hauteur page
createdAt   DateTime
updatedAt   DateTime
```

### AdminOtp
```
id          String   @id
code        String
expiresAt   DateTime
used        Boolean  @default(false)
createdAt   DateTime
```

## Enum RectangleType
`phrase | paragraph | article | section | figure | table | formula | annexe`

## Règles métier BDD
- Les rectangles d'une même page **ne doivent pas se chevaucher** (vérifié côté API)
- Suppression d'un parent → enfants passent à `fatherId = null` (SetNull)
- Suppression d'un document → tous ses rectangles supprimés (Cascade)
- Labels hérités récursivement depuis les ancêtres (logique frontend)
- Coordonnées en **pourcentage** (0–100), pas en pixels

## Index importants
```
@@index([createdAt])              → documents
@@index([documentId])             → rectangles
@@index([documentId, page])       → rectangles (filtrage par page)
@@index([fatherId])               → rectangles (arbre)
```

## Connexion
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/basis_norm_explorer?schema=public"
```
