# Multi-stage build for backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN yarn build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies (including dev dependencies for scripts)
RUN yarn install --frozen-lockfile

# Copy built files and source code from builder (for running scripts)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src

# Expose port
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]

