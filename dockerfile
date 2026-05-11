# ---- Stage 1: Build & Download Models ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Download the AI models directly inside the image
RUN node scripts/download-models.mjs

# Build Next.js in standalone mode
RUN npm run build

# ---- Stage 2: Production Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV MODEL_PATH=/app/models
ENV ALLOW_REMOTE_MODELS=false

COPY --from=builder /app/models ./models
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]