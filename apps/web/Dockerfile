# Web Dockerfile - Multi-stage build for production optimization

# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy shared package and api-client
COPY packages/shared ./packages/shared
COPY packages/api-client ./packages/api-client
# Copy Web package files
COPY apps/web/package.json ./apps/web/package.json
COPY pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy Web source code
COPY apps/web ./apps/web/

# Build shared package first
RUN pnpm --filter @lumea/shared build

# Build api-client package
RUN pnpm --filter @lumea/api-client build

# Build arguments
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

# Build application
WORKDIR /app/apps/web
RUN pnpm build

# Development stage
FROM node:22-alpine AS development

RUN npm install -g pnpm@10

WORKDIR /app

COPY --from=builder /app ./

WORKDIR /app/apps/web

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5173 || exit 1

CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/nginx.conf

# Create logs directory
RUN mkdir -p /var/log/nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/log/nginx

# Expose port 80
EXPOSE 80

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]