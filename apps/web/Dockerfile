# Web Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../../packages/shared ./packages/shared

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build arguments
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build application
RUN npm run build

# Install serve for production
RUN npm install -g serve

EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5173 || exit 1

CMD ["serve", "-s", "dist", "-l", "5173"]