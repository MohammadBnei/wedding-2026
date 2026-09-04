# Build with bun, run with bun. adapter-node emits build/index.js.
#
# PINNED, not floating on `1-alpine`. The wall calls Bun.Image and Bun.S3Client,
# both of which are recent — with a floating tag the deployed runtime is whatever
# the build-runner happened to pull, and a stale layer cache would produce an
# image where Bun.Image is undefined. That surfaces as a TypeError on the first
# guest's upload, at the reception, with nobody free to debug it. Verified: this
# tag has Bun.Image (backend "bun", codecs statically linked on musl),
# Bun.S3Client, EXIF auto-orientation, and maxPixels enforcement.
FROM oven/bun:1.3.14-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.3.14-alpine AS runner
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
