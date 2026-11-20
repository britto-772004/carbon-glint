# Build from the repo root:  docker build -f apps/api/Dockerfile .
FROM node:24-slim AS build
RUN npm install -g pnpm@10.15.0
WORKDIR /repo

# Install with only manifests first for better layer caching.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/api-spec/package.json packages/api-spec/
RUN pnpm install --frozen-lockfile --filter @carbon-glint/api...

COPY tsconfig.base.json ./
COPY packages/api-spec packages/api-spec
COPY apps/api apps/api
RUN pnpm --filter @carbon-glint/api-spec run generate \
 && pnpm --filter @carbon-glint/api run build \
 && pnpm --filter @carbon-glint/api deploy --prod --legacy /out

FROM node:24-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 8080
CMD ["node", "--enable-source-maps", "dist/server.js"]
