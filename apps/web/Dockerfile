# Web Dockerfile
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json . /

# Copy shared package
COPY packages/shared ./packages/shared
# Copy Web package files
COPY apps/web/package.json ./apps/web/package.json
COPY pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy Web source code
COPY . ./apps/web/

# Build shared package first
RUN pnpm --filter @lumea/shared build

# Build arguments
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build application
WORKDIR /app/apps/web
RUN pnpm build

# Install serve for production
RUN npm install -g serve

EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5173 || exit 1

CMD ["serve", "-s", "dist", "-l", "5173"]