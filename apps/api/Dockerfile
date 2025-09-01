# API Dockerfile - Multi-stage build for production optimization

# Development stage
FROM node:22-bullseye-slim AS development

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
COPY apps/api/package.json ./apps/api/package.json
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

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["pnpm", "start:dev"]

# Production stage
FROM node:22-bullseye-slim AS production

# Install only runtime dependencies and minimal system tools
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ca-certificates \
    libgl1-mesa-dev \
    libglu1-mesa-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install KTX-Software for production
RUN wget -O /tmp/ktx.deb https://github.com/KhronosGroup/KTX-Software/releases/download/v4.4.0/KTX-Software-4.4.0-Linux-x86_64.deb \
 && apt-get install -y /tmp/ktx.deb \
 && rm -f /tmp/ktx.deb

# Create non-root user for security
RUN groupadd -r lumea && useradd -r -g lumea lumea

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy built application from development stage
COPY --from=development /app/packages/shared/dist ./packages/shared/dist
COPY --from=development /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=development /app/apps/api/dist ./apps/api/dist
COPY --from=development /app/apps/api/package.json ./apps/api/package.json
COPY --from=development /app/apps/api/prisma ./apps/api/prisma
COPY --from=development /app/node_modules ./node_modules
COPY --from=development /app/package.json ./package.json
COPY --from=development /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Set proper ownership
RUN chown -R lumea:lumea /app

# Switch to non-root user
USER lumea

# Set working directory to API
WORKDIR /app/apps/api

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Production health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start production server
CMD ["node", "dist/src/main.js"]