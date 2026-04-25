# syntax=docker/dockerfile:1

FROM node:24-trixie-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends git

WORKDIR /app

COPY . .

RUN npm ci && npm run build:client && npm run build:server



FROM node:24-trixie-slim AS running-env

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --production



FROM gcr.io/distroless/nodejs24-debian13:nonroot AS runner

WORKDIR /app

COPY --from=running-env /app/node_modules ./node_modules
COPY --from=builder /app/dist/ ./dist/

ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT [ "/nodejs/bin/node" ]
CMD [ "dist/index.mjs" ]
