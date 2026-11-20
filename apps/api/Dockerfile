# Carbon Glint API image — also runs the worker and one-off tasks:
#   api:     node dist/server.js            (default)
#   worker:  node dist/worker.js
#   migrate: node dist/migrate.js
#   factors: node dist/import-factors.js defra --year 2026 --skip-if-present
#   admin:   node dist/seed-superadmin.js
# Build from the repo root:  docker build -f apps/api/Dockerfile -t carbon-glint-api .
FROM node:24-slim AS build
RUN npm install -g pnpm@10.15.0
WORKDIR /repo

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
LABEL org.opencontainers.image.source="https://github.com/britto-772004/carbon-glint" \
      org.opencontainers.image.description="Carbon Glint API / worker (ESG carbon accounting)" \
      org.opencontainers.image.licenses="Apache-2.0"
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    FILES_DIR=/data/files
WORKDIR /app
COPY --from=build --chown=node:node /out ./
RUN mkdir -p /data/files && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/server.js"]
