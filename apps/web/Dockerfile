# Carbon Glint web image — static React build served by Caddy, proxying /api to the API container.
# Build from the repo root:  docker build -f apps/web/Dockerfile -t carbon-glint-web .
FROM node:24-slim AS build
RUN npm install -g pnpm@10.15.0
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/sdk/package.json packages/sdk/
COPY packages/api-spec/package.json packages/api-spec/
RUN pnpm install --frozen-lockfile --filter @carbon-glint/web... --filter @carbon-glint/api-spec
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/web apps/web
ENV VITE_API_BASE_URL=/api
RUN pnpm --filter @carbon-glint/api-spec --filter @carbon-glint/sdk run generate \
 && pnpm --filter @carbon-glint/web exec vite build

FROM caddy:2.11-alpine
LABEL org.opencontainers.image.source="https://github.com/britto-772004/carbon-glint" \
      org.opencontainers.image.description="Carbon Glint web app (Caddy)" \
      org.opencontainers.image.licenses="Apache-2.0"
ENV API_UPSTREAM=api:8080
COPY apps/web/Caddyfile.docker /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv
EXPOSE 80
