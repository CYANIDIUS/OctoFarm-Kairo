# Node.js 18 on Alpine — includes nodejs, npm, and tini out of the box
FROM node:18-alpine AS base

RUN apk add --no-cache tini

ENV NODE_ENV=production

RUN npm install -g pm2

RUN adduser -D octofarm --home /app && \
    mkdir -p /scripts && \
    chown -R octofarm:octofarm /scripts/

FROM base AS compiler

RUN apk add --no-cache \
    alpine-sdk \
    make \
    gcc \
    g++ \
    python3

WORKDIR /tmp/app

COPY server/package.json ./server/package.json
COPY server/package-lock.json ./server/package-lock.json

WORKDIR /tmp/app/server

RUN npm ci --omit=dev

WORKDIR /tmp/app

FROM base AS runtime

COPY --chown=octofarm:octofarm --from=compiler /tmp/app/server/node_modules /app/server/node_modules
COPY --chown=octofarm:octofarm . /app

RUN rm -rf /tmp/app

USER octofarm
WORKDIR /app

RUN chmod +x ./docker/entrypoint.sh
ENTRYPOINT [ "/sbin/tini", "--" ]
CMD ["./docker/entrypoint.sh"]
