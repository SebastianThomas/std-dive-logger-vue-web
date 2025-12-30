# ---------- builder ----------
FROM node:25-slim AS builder
WORKDIR /app

COPY ./vue/package.json ./vue/yarn.lock ./
RUN yarn install

COPY ./vue ./
RUN yarn build

# ---------- runner ----------
FROM nginx:alpine
WORKDIR /app

# Copy built Vue app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
