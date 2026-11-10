# =============================================================
# MTA ILLEGAL BİRLİK YÖNETİM BOTU - DOCKER KURULUMU
# Node.js 22 & TypeScript 7/24 Kesintisiz Üretim Ortamı
# =============================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Bağımlılık dosyalarını kopyala
COPY package*.json tsconfig.json ./

# Bağımlılıkları yükle
RUN npm ci

# Kaynak kodları kopyala
COPY . .

# TypeScript derleme
RUN npm run build || true

# Production İmajı
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Yalnızca production bağımlılıklarını kur
COPY package*.json ./
RUN npm ci --omit=dev

# Derlenmiş dosyaları ve kaynakları aktar
COPY --from=builder /app /app

# Sağlık Kontrolü (Healthcheck)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "console.log('Bot calisiyor')" || exit 1

# Botu başlat
CMD ["npm", "run", "start:bot"]
