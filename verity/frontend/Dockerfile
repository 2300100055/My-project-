FROM node:22-alpine AS base

WORKDIR /app
COPY package.json ./
RUN npm install --frozen-lockfile

COPY . .
RUN npm run build

# Production runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S verity && adduser -S verity -G verity
COPY --from=base --chown=verity:verity /app/.next/standalone ./
COPY --from=base --chown=verity:verity /app/.next/static ./.next/static
COPY --from=base --chown=verity:verity /app/public ./public

USER verity
EXPOSE 3000
CMD ["node", "server.js"]
