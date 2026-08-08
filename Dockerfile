# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9.15.9

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prefer-offline

COPY . .
RUN mkdir -p public

# No real secrets/DB at image build — validate at runtime
ENV SKIP_ENV_VALIDATION=true
RUN pnpm run build

# Production stage — standalone server only (no full node_modules)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Stop Next from phoning home (outbound blocks Railway sleep)
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# preDeploy: migrate.mjs + deps (not in Next standalone trace)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/scripts/migrate.mjs ./src/scripts/migrate.mjs
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres

EXPOSE 3000

CMD ["node", "server.js"]
