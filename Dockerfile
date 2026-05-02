# syntax=docker/dockerfile:1.7

# ─── Base image: Node 20 on Debian Bookworm ─────────────────────────────────
# Bookworm gives us recent tesseract-ocr packages and Python 3.11.
FROM node:20-bookworm-slim AS base

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production

# System deps: Python (for the analysis pipeline), Tesseract (OCR with FR/EN/NL
# language packs), OpenSSL (Prisma engines), build tools (psycopg2-binary
# usually has wheels but keep gcc as a safety net for ARM hosts).
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv \
        tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng tesseract-ocr-nld \
        openssl ca-certificates \
        gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ─── Python venv ────────────────────────────────────────────────────────────
# lib/python.ts looks up ./.venv/bin/python3 first — match that path exactly
# so the Next routes pick up the venv interpreter at runtime.
COPY python-pipeline/requirements.txt ./python-pipeline/requirements.txt
RUN python3 -m venv /app/.venv \
    && /app/.venv/bin/pip install --no-cache-dir --upgrade pip \
    && /app/.venv/bin/pip install --no-cache-dir -r ./python-pipeline/requirements.txt

# ─── Node deps ──────────────────────────────────────────────────────────────
# Use NODE_ENV=development for the install so devDependencies (typescript,
# tailwind, @types/*) are present for `next build`. We flip it back before
# starting the server.
COPY package.json package-lock.json* ./
RUN NODE_ENV=development npm ci

# ─── App source + build ─────────────────────────────────────────────────────
COPY . .

RUN npx prisma generate && npm run build

# Ensure the runtime mount points exist even before the volume is attached
# (Railway will mount over them; locally they let the app boot without errors).
RUN mkdir -p /app/uploads/pdfs /app/public/pdf-pages

ENV PORT=3000
EXPOSE 3000

# At boot: apply pending Prisma migrations, then start Next.
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p ${PORT:-3000}"]
