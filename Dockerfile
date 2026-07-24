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

# Production stage — prod deps only; migrate via drizzle-orm (not drizzle-kit)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Stop Next from phoning home (outbound blocks Railway sleep)
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm@9.15.9

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --prefer-offline

COPY --from=builder /app/.next ./.next
# public may be empty; keep dir present for Next
RUN mkdir -p public
COPY --from=builder /app/public/ ./public/
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/scripts/migrate.mjs ./src/scripts/migrate.mjs

# Railway injects PORT; Next defaults to 3000 locally
ENV PORT=3000
EXPOSE 3000

CMD ["pnpm", "start"]
