# Stage 1: base — Node.js 18 on Debian slim (no Alpine apk issues)
FROM node:18-slim AS base

# Install dumb-init as lightweight PID 1 (replaces tini)
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

RUN npm install -g pm2 && \
    useradd -m -d /app octofarm && \
    mkdir -p /scripts && \
    chown -R octofarm:octofarm /scripts/

# Stage 2: compiler — install native dependencies
FROM base AS compiler

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp/app

COPY server/package.json ./server/package.json
COPY server/package-lock.json ./server/package-lock.json

WORKDIR /tmp/app/server

RUN npm ci --omit=dev

WORKDIR /tmp/app

# Stage 3: runtime — clean image
FROM base AS runtime

COPY --chown=octofarm:octofarm --from=compiler /tmp/app/server/node_modules /app/server/node_modules
COPY --chown=octofarm:octofarm . /app

RUN rm -rf /tmp/app

USER octofarm
WORKDIR /app

RUN chmod +x ./docker/entrypoint.sh
ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker/entrypoint.sh"]
