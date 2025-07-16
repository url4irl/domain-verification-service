# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@10.6.5

# Copy package.json and pnpm-lock.yaml to leverage Docker cache layers
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install pnpm globally (needed for pnpm start)
RUN npm install -g pnpm@10.6.5

# Copy package.json and pnpm-lock.yaml for production dependencies
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy compiled application from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/lib/db/migrations ./lib/db/migrations
COPY --from=builder /app/openapi.json ./openapi.json

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to the nodejs user
USER nodejs

# Expose the port the app runs on
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); console.log('Starting health check...'); const req = http.request({ host: '127.0.0.1', port: process.env.PORT || 4000, path: '/', timeout: 2000 }, (res) => { console.log('Response received, status:', res.statusCode); if (res.statusCode === 200) { console.log('Health check passed'); process.exit(0); } else { console.log('Health check failed - wrong status code'); process.exit(1); } }); req.on('error', (err) => { console.log('Health check connection error:', err.message); process.exit(1); }); req.setTimeout(2000, () => { console.log('Health check timeout - no response'); process.exit(1); }); req.end();"

# Start the application
CMD ["pnpm", "start"]