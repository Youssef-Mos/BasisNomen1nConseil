# API Routes

## Documents

### GET /api/documents
Liste tous les documents, triés par date décroissante.
Retourne : `DocumentListItem[]` (id, title, pageCount, rectangleCount, createdAt)

### POST /api/documents
Upload d'un PDF. Body : `FormData` avec `file` (PDF) + `title`.
- Calcule SHA-256, rejette doublon (409)
- Extrait pageCount via pdf-lib
- Sauvegarde dans `uploads/pdfs/{hash}.pdf`
- Lance `render_pages.py` (sync) pour générer les PNG de pages
- Crée le document en BDD
Retourne : `DocumentListItem` (status 201)

### GET /api/documents/:id
Détail d'un document incluant `pdfPath` et `updatedAt`.

### DELETE /api/documents/:id
Supprime le document (cascade sur les rectangles).

### GET /api/documents/:id/rectangles
Rectangles d'un document avec **filtres** (query params) :
- `keywords` / `projectAddress` / `permitDate` → recherche fulltext dans textFr/En/Nl
- `topic` / `buildingHeightType` / `compartmentCategory` / `roomCategory` → filtres label exact (Prisma `has`)
- `pdfPage` → filtre par numéro de page (pour l'éditeur admin)
- `page` / `pageSize` → pagination (défaut: page=1, pageSize=120, max=300)

Retourne : `{ items, page, pageSize, total, hasMore }`
Inclut `father` et `children` pour chaque rectangle.

### POST /api/documents/:id/rectangles
Crée un rectangle.
- Vérifie overlap sur la même page (409 si conflit)
- Valide `fatherId` s'il est fourni
- Lance `crop_rectangle.py` (sync) après création
Retourne : rectangle complet (status 201)

### GET /api/documents/:id/pdf
Sert le fichier PDF brut (streaming) depuis `uploads/pdfs/`.

## Rectangles

### PUT /api/rectangles/:id
Mise à jour partielle d'un rectangle (seuls les champs fournis sont modifiés).
- Si géométrie changée → vérifie overlaps + re-extrait textFr via OCR + régénère crop
- Valide fatherId (pas de boucle, même document)
Retourne : rectangle complet mis à jour

### DELETE /api/rectangles/:id
Supprime le rectangle. Enfants passent à `fatherId = null`.

### POST /api/rectangles/:id/extract-text
Lance OCR sur la zone du rectangle, retourne `{ text: string | null }`.

## Crop

### GET /api/crop/:rectId
Sert l'image PNG du crop depuis `public/pdf-pages/{docId}/crops/{rectId}.png`.
Protégé contre hotlinking (vérification Referer).

## Admin Auth

### POST /api/admin/request-otp
Génère un OTP (6 chiffres, 10 min), le marque dans BDD, l'envoie (email ou console en dev).

### POST /api/admin/verify-otp
Vérifie l'OTP. Si valide → crée JWT signé → cookie `admin_session` (httpOnly, secure).

### POST /api/admin/logout
Efface le cookie `admin_session`.

## Authentification middleware
Voir `middleware.ts` — JWT vérifié via `jose` pour toutes les routes `/admin` et `/api/documents`, `/api/rectangles`, `/api/analyze`.
Routes publiques : `/explore`, `/api/admin/request-otp`, `/api/admin/verify-otp`, `/admin/login`, `/api/crop`.
