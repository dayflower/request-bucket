# syntax=docker/dockerfile:1

FROM oven/bun:1-debian AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile \
 && bun run build



FROM oven/bun:1-distroless AS runner

WORKDIR /app

COPY --from=builder /app/server ./server
COPY --from=builder /app/common ./common
COPY --from=builder /app/dist/public ./dist/public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production

EXPOSE 3000

CMD ["server/index.ts"]
