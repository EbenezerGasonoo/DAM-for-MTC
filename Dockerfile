# Multi-stage Dockerfile for MTC DAM (Next.js + Prisma + FFmpeg + Sharp)
FROM node:20-slim AS base

# Install system dependencies: FFmpeg, OpenSSL (for Prisma), build essentials
RUN apt-get update && apt-get install -y \
    ffmpeg \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time env vars
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:./dev.db"

# Generate Prisma client and build Next.js
RUN npx prisma generate
RUN npm run build

# 3. Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create persistent storage folder for fallback asset storage
RUN mkdir -p /app/public/storage

# Copy built application & dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/seed-admin.mjs ./seed-admin.mjs

EXPOSE 3000

# Push DB schema on startup, ensure Admin exists, start Ingest Daemon, and start Next.js
CMD ["sh", "-c", "npx prisma db push && node seed-admin.mjs && node scripts/ingest-daemon.mjs & npm run start"]
