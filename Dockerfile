# ── Stage 1: Build Vite frontend ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# ── Stage 2: Production runtime ─────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install dependencies (includes tsx + vite needed to run server.ts)
COPY package*.json ./
RUN npm ci

# Copy server entry point and TypeScript config
COPY server.ts tsconfig.json ./

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# data/ is mounted as a Docker volume at runtime; do NOT bake it into the image
# The server calls ensureDataDir() on startup to create subdirs and seed JSON files.

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server.ts"]
