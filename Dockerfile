# Stage 1: base — Node.js 18 on Debian slim
FROM node:18-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

RUN npm install -g pm2 && \
    useradd -m -d /app octofarm && \
    mkdir -p /scripts && \
    chown -R octofarm:octofarm /scripts/

# Stage 2: build server native dependencies
FROM base AS server-compiler

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp/app

COPY server/package.json ./server/package.json
COPY server/package-lock.json ./server/package-lock.json

WORKDIR /tmp/app/server
RUN npm ci --omit=dev

# Stage 3: build client (webpack)
FROM node:18-slim AS client-compiler

WORKDIR /tmp/app
COPY package.json ./
COPY client/ ./client/
COPY server/assets/ ./server/assets/

WORKDIR /tmp/app/client
RUN npm ci
RUN npm run build

# Stage 4: runtime — clean image
FROM base AS runtime

# Copy server node_modules
COPY --chown=octofarm:octofarm --from=server-compiler /tmp/app/server/node_modules /app/server/node_modules

# Copy everything from repo
COPY --chown=octofarm:octofarm . /app

# Overwrite server/assets with freshly built client files
COPY --chown=octofarm:octofarm --from=client-compiler /tmp/app/server/assets /app/server/assets

RUN rm -rf /tmp/app && mkdir -p /app/logs /app/server/uploads/orders

USER octofarm
WORKDIR /app

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "cd server && pm2 start app.js --name OctoFarm --no-daemon -o 'logs/pm2.log' -e 'logs/pm2.error.log' --time --restart-delay=1000 --exp-backoff-restart-delay=1500"]
