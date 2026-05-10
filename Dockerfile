# ── Stage 1: Build Vite frontend ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# 設置前端構建環境變數 (Vite 會自動讀取 VITE_* 變數)
ENV VITE_AUTH_TYPE=db2
ENV VITE_ADMIN_USER=admin
ENV VITE_ADMIN_PASS=admin123

# 安裝編譯依賴 (需要編譯 odbc 原生模組)
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# ── Stage 2: Production runtime ─────────────────────────────────────────────
FROM node:22

WORKDIR /app

# 安裝編譯工具用於編譯 odbc 原生模組
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies (includes tsx + vite needed to run server.ts)
COPY package*.json ./
RUN npm ci

# 安裝 IBM i Access ODBC Driver 官方 Repository
RUN curl https://public.dhe.ibm.com/software/ibmi/products/odbc/debs/dists/1.1.0/ibmi-acs-1.1.0.list | tee /etc/apt/sources.list.d/ibmi-acs-1.1.0.list

# 安裝 IBM DB2 連線驅動官方 Repository
RUN curl https://public.dhe.ibm.com/ibmdl/export/pub/software/data/db2/drivers/odbc_cli/linuxx64_odbc_cli.tar.gz -o /tmp/db2_odbc.tar.gz && \
    mkdir -p /opt/ibm/db2 && \
    tar -xzf /tmp/db2_odbc.tar.gz -C /opt/ibm/db2 && \
    rm /tmp/db2_odbc.tar.gz

# 安裝 IBM i Access ODBC Driver、DB2 連線驅動和 UnixODBC 工具
RUN apt-get update && apt-get install -y \
    ibm-iaccess \
    unixodbc-dev \
    unixodbc \
    libxml2 \
    && rm -rf /var/lib/apt/lists/*

# 複製 server 和配置
COPY server.ts tsconfig.json ./

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# data/ is mounted as a Docker volume at runtime; do NOT bake it into the image
# The server calls ensureDataDir() on startup to create subdirs and seed JSON files.

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node_modules/.bin/tsx", "server.ts"]
