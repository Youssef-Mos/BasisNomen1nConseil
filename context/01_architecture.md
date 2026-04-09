# Architecture — Basis Norm Explorer

## Objectif du projet

Application web pour explorer des **documents PDF réglementaires** (normes belges de sécurité incendie, etc.).
- Un admin annote manuellement les PDFs en dessinant des **rectangles** sur chaque page
- Les utilisateurs explorent le contenu structuré via l'interface `/explore`

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript strict |
| Style | Tailwind CSS + variables CSS pour le thème |
| BDD | PostgreSQL 14+ |
| ORM | Prisma |
| i18n | next-intl (FR / EN / NL) |
| Validation | Zod |
| Auth | JWT via `jose` (cookie `admin_session`) |
| Python | pytesseract, PyMuPDF, Pillow |

## Structure des dossiers

```
app/
  admin/                    → Back-office admin (protégé par JWT)
    login/                  → Page login OTP
    [id]/                   → Éditeur PDF pour un document
  explore/                  → Interface utilisateur publique
    [id]/                   → Vue d'un document (Server Component)
  api/
    admin/                  → request-otp, verify-otp, logout
    documents/              → CRUD documents + sous-routes
      [id]/rectangles/      → GET (filtres) + POST rectangle
      [id]/pdf/             → Serve le PDF brut
      [id]/analyze/         → Analyse IA (si implémentée)
    rectangles/
      [id]/                 → PUT + DELETE rectangle
      [id]/extract-text/    → OCR zone → texte
    crop/
      [rectId]/             → Serve l'image crop d'un rectangle

components/
  admin/                    → DocumentList, PdfEditor, PdfCanvas, PropertiesPanel, ToolBar, ParentSelector
  explore/                  → DocumentViewer, FilterSidebar, ResultCard, TreeNode, Lightbox, RectCrop
  ui/                       → Composants partagés

lib/
  prisma.ts                 → Instance Prisma singleton
  types.ts                  → Types partagés (RectangleData, DocumentListItem, etc.)
  api.ts                    → Fonctions fetch côté client
  hooks/                    → React hooks custom

python-pipeline/
  render_pages.py           → Rend les pages PDF en PNG (au moment de l'upload)
  crop_rectangle.py         → Crop d'une zone rectangulaire (au save d'un rect)
  extract_text_zone.py      → OCR sur une zone (retourne JSON {text})

public/pdf-pages/
  {docId}/
    page-1.png, page-2.png  → Pages rendues
    crops/
      {rectId}.png          → Crop image de chaque rectangle

uploads/pdfs/               → PDFs bruts stockés (non versionné)
```

## Flux principal

```
Upload PDF
  → SHA-256 dedup
  → Stockage uploads/pdfs/{hash}.pdf
  → python render_pages.py → public/pdf-pages/{docId}/page-X.png
  → Document créé en BDD

Admin annote
  → Dessine rectangle sur canvas
  → POST /api/documents/:id/rectangles
  → python crop_rectangle.py → public/pdf-pages/{docId}/crops/{rectId}.png
  → python extract_text_zone.py → textFr auto-rempli si géométrie nouvelle

Utilisateur explore
  → GET /explore/:id (Server Component)
  → Fetch tous les rectangles du document
  → DocumentViewer avec filtres (mots-clés, labels, page PDF, etc.)
```

## Branche courante

`JALON1BIS` — basée sur `main`
