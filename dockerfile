# ---- Stage 1: Build & Download Models ----
FROM node:20-slim AS builder
WORKDIR /app

# Only install python3 + make + g++ required by onnxruntime-node
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci                           # production deps only .mjs do

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Download models (plain JS, runs fine)
RUN node scripts/download-models.mjs

# Build Next.js in standalone mode
RUN npm run build

# ---- Stage 2: Production Runner ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV MODEL_PATH=/app/models
ENV ALLOW_REMOTE_MODELS=false

COPY --from=builder /app/models ./models
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
#CMD ["node", "server.js"]
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js -p ${PORT}"]