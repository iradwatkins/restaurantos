FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_CONVEX_URL=http://72.60.28.175:3214
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=@restaurantos/admin

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
USER nextjs
EXPOSE 3005
ENV PORT=3005
CMD ["node", "apps/admin/server.js"]
