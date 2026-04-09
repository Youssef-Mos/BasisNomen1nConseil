# Authentification Admin

## Flux OTP

1. Admin va sur `/admin/login`
2. Soumet son email → `POST /api/admin/request-otp`
   - Génère un code 6 chiffres
   - Stocke dans `admin_otps` (expiresAt = now + 10 min, used = false)
   - Envoie le code (email en prod, console en dev)
3. Admin saisit le code → `POST /api/admin/verify-otp`
   - Vérifie code + non expiré + non utilisé
   - Marque `used = true`
   - Crée un JWT signé avec `ADMIN_SESSION_SECRET`
   - Set cookie `admin_session` (httpOnly, secure, SameSite=Strict)
4. Admin clique logout → `POST /api/admin/logout`
   - Efface le cookie

## Middleware (`middleware.ts`)

```
Routes publiques (pass-through) :
  /explore/**
  /api/admin/request-otp
  /api/admin/verify-otp
  /admin/login
  /api/crop/**

Routes protégées (JWT requis) :
  /admin/**
  /api/rectangles/**
  /api/documents/**
  /api/analyze/**

Si token absent :
  → API : 401 JSON
  → Page : redirect /admin/login

Si token invalide/expiré :
  → API : 401 JSON
  → Page : redirect /admin/login
```

## Variables d'environnement requises

```env
DATABASE_URL="postgresql://..."
ADMIN_SESSION_SECRET="..."   # secret JWT, min 32 chars
```

## Librairie JWT
`jose` (pas `jsonwebtoken`) — compatible Edge Runtime Next.js.

## Modèle AdminOtp
- Une seule entrée "active" à la fois
- Les anciennes sont marquées `used = true` avant d'en créer une nouvelle
- Pas de suppression automatique (nettoyage manuel ou via tâche cron)
