# ---------- builder ----------
FROM node:25-slim AS builder
WORKDIR /app

COPY ./nextjs/package.json ./nextjs/yarn.lock ./
RUN yarn install

COPY ./nextjs ./
COPY ./nextjs/.env.staging .env.local
RUN yarn build

# ---------- runner ----------
FROM node:25-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
RUN yarn install --production && yarn cache clean

CMD ["yarn", "start"]
