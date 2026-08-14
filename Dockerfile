# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Verknüpft das Paket auf ghcr.io mit diesem Repo — ohne source-Label steht das
# Image dort ohne Bezug zum Quellcode und erbt dessen Sichtbarkeit nicht.
LABEL org.opencontainers.image.source="https://github.com/dmyrenne/quince"
LABEL org.opencontainers.image.description="Self-hosted, open-source recipe manager in the look and feel of Mela"
LABEL org.opencontainers.image.licenses="MIT"

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/build ./build

ENV PORT=3000
ENV DATA_DIR=/data
# Recipe photos are embedded as base64 in the JSON body, so the default
# 512K limit is too small — a whole .melarecipes library easily hits tens of MB.
ENV BODY_SIZE_LIMIT=128M
# Must match the URL the app is actually reached under, otherwise SvelteKit's
# CSRF check rejects every upload: without ORIGIN, adapter-node assumes https
# and then disagrees with the browser's Origin header. Override this when
# serving from anything other than http://localhost:3000.
ENV ORIGIN=http://localhost:3000

VOLUME /data
EXPOSE 3000

CMD ["node", "build"]
