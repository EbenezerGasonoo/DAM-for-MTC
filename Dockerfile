# Multi-stage Dockerfile for MTC DAM (Next.js + Prisma + FFmpeg + Sharp)
FROM node:20-slim AS base

# Install system dependencies: FFmpeg, OpenSSL (for Prisma), curl, tar
RUN apt-get update && apt-get install -y \
    ffmpeg \
    openssl \
    ca-certificates \
    curl \
    tar \
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

# Install local on-premises whisper.cpp engine + ggml-base.bin model for offline/fallback AI transcription
RUN mkdir -p /opt/whisper && \
    curl -sL https://github.com/ggml-org/whisper.cpp/releases/download/b4938/whisper-bin-ubuntu-x64.tar.gz | tar -xz -C /tmp && \
    cp -r /tmp/whisper-bin-ubuntu-x64/* /opt/whisper/ && \
    chmod +x /opt/whisper/whisper-cli && \
    curl -sL https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o /opt/whisper/ggml-base.bin && \
    rm -rf /tmp/whisper-bin-ubuntu-x64

ENV LD_LIBRARY_PATH="/opt/whisper:${LD_LIBRARY_PATH}"
ENV PATH="/opt/whisper:${PATH}"
ENV WHISPER_CPP_PATH="/opt/whisper/whisper-cli"
ENV WHISPER_MODEL_PATH="/opt/whisper/ggml-base.bin"

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
