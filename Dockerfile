# Multi-stage build for backend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* package-lock.json* ./

# Install dependencies
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else yarn install; \
    fi

# Copy source code
COPY . .

# Build TypeScript
RUN yarn build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* package-lock.json* ./

# Install all dependencies (including dev dependencies for scripts)
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else yarn install; \
    fi

# Copy built files and source code from builder (for running scripts)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
# Create public directory (backend-mms may not have one)
RUN mkdir -p ./public

# Expose port
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]

