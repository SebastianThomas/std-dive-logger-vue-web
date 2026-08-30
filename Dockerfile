# check=skip=SecretsUsedInArgOrEnv

# CARTO_API_KEY below is a build-arg on purpose: it's a public client-side basemap key (it ends
# up in the JS bundle no matter what) and the builder stage it lives in is discarded, so it
# never reaches the final image's `docker history`. Restrict it to the deployment's domains in
# the CARTO console.

# ---------- builder ----------
FROM node:25-slim AS builder
WORKDIR /app

ARG BUILD_MODE=production
# CARTO basemap key - passed by build-frontend.sh from $CARTO_API_KEY (CI: the STAGING
# environment secret). Never put it in a .env file. Empty = the keyless public CARTO basemap.
ARG CARTO_API_KEY=

COPY ./vue/package.json ./vue/yarn.lock ./
RUN yarn install

COPY ./vue ./
# Vite reads VITE_-prefixed vars from the environment and they win over any .env file value.
RUN VITE_CARTO_API_KEY="$CARTO_API_KEY" yarn build --mode $BUILD_MODE

# ---------- runner ----------
FROM nginx:alpine
WORKDIR /app

# Copy built Vue app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
