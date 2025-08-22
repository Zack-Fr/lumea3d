# API Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../../packages/shared ./packages/shared

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "start:prod"]