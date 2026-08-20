# Build with bun, run with bun. adapter-node emits build/index.js.
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# node_modules is needed at runtime: adapter-node does not bundle dependencies
# (postgres and openai stay external).
COPY --from=builder /app/package.json /app/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=builder /app/build ./build

EXPOSE 3000
USER bun
CMD ["bun", "./build/index.js"]
