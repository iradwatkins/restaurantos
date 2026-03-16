FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=@restaurantos/portal

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/portal/.next/standalone ./
COPY --from=builder /app/apps/portal/.next/static ./apps/portal/.next/static
USER nextjs
EXPOSE 3006
ENV PORT=3006
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:3006/api/health || exit 1
CMD ["node", "apps/portal/server.js"]
