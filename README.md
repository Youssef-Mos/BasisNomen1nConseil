# Basis Norm Explorer

Base technique Next.js pour une application d'exploration de documents PDF reglementaires structures.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- next-intl
- Zod

## Prerequis

- Node.js 20+
- PostgreSQL 14+

## Installation

```bash
npm install
```

## Configuration environnement

Le fichier `.env` est preconfigure avec une URL locale par defaut:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/basis_norm_explorer?schema=public"
```

Adaptez-la a votre instance PostgreSQL.

## Prisma

Generer le client Prisma:

```bash
npm run prisma:generate
```

Creer la premiere migration:

```bash
npm run prisma:migrate -- --name init
```

Ouvrir Prisma Studio:

```bash
npm run prisma:studio
```

## Developpement

```bash
npm run dev
```

Application disponible sur http://localhost:3000.
