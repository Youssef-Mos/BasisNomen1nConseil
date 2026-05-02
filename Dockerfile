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

# Prepend the venv to PATH so any route that spawns `python3` directly
# (instead of going through getPythonExecutable) still hits the venv
# interpreter that has PyMuPDF, pytesseract, etc. installed.
ENV PATH="/app/.venv/bin:${PATH}"

# ─── Node deps ──────────────────────────────────────────────────────────────
# Use NODE_ENV=development for the install so devDependencies (typescript,
# tailwind, @types/*) are present for `next build`. We flip it back before
# starting the server.
COPY package.json package-lock.json* ./
RUN NODE_ENV=development npm ci

# ─── App source + build ─────────────────────────────────────────────────────
COPY . .

RUN npx prisma generate && npm run build

# Railway only allows one persistent volume per service, so we mount it at
# /app/data and symlink the two app paths into it at boot. Remove any
# stale build-time directories so the symlinks can be created cleanly.
RUN rm -rf /app/uploads /app/public/pdf-pages

ENV PORT=3000
EXPOSE 3000

# At boot:
#   1. ensure subdirs exist inside the persistent volume
#   2. symlink /app/uploads and /app/public/pdf-pages onto the volume
#   3. apply pending Prisma migrations
#   4. start Next (exec so signals propagate to the Node process)
CMD ["sh", "-c", "set -e; \
  mkdir -p /app/data/uploads/pdfs /app/data/pdf-pages; \
  ln -sfn /app/data/uploads /app/uploads; \
  ln -sfn /app/data/pdf-pages /app/public/pdf-pages; \
  npx prisma migrate deploy; \
  exec npx next start -p ${PORT:-3000}"]
