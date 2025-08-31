# API Dockerfile
FROM node:22-bullseye-slim

# Install system dependencies for 3D processing
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    build-essential \
    cmake \
    git \
    unzip \
    libgl1-mesa-dev \
    libglu1-mesa-dev \
    && rm -rf /var/lib/apt/lists/*

# Install KTX-Software for toktx tool
# Example: FROM debian:bookworm or ubuntu:22.04
RUN apt-get update && apt-get install -y wget ca-certificates \
 && wget -O /tmp/ktx.deb https://github.com/KhronosGroup/KTX-Software/releases/download/v4.4.0/KTX-Software-4.4.0-Linux-x86_64.deb \
 && apt-get install -y /tmp/ktx.deb \
 && rm -f /tmp/ktx.deb
# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy shared package
COPY packages/shared ./packages/shared

# Copy API package files  
COPY  apps/api/package.json ./apps/api/package.json
COPY pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy API source code (including Prisma schema)
COPY apps/api/src ./apps/api/src
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/tsconfig*.json ./apps/api/

# Build shared package first
RUN pnpm --filter @lumea/shared build

# Generate Prisma client
WORKDIR /app/apps/api
RUN ls -la prisma/ && pnpm prisma:generate

# Build application
RUN pnpm build

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["pnpm", "start:prod"]