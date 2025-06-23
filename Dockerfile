# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup backend and final image
FROM node:18-alpine AS production
WORKDIR /app

# Install required libraries for Prisma
RUN apk add --no-cache openssl libc6-compat

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy backend source
COPY backend/src ./src
COPY backend/prisma ./prisma
COPY backend/.env ./.env
COPY init-db.js ./
COPY migrate-vendor-to-contact.js ./
COPY migrate-bigint.js ./
COPY reset-db.js ./

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Generate Prisma client
RUN npx prisma generate

# Create SQLite database directory with proper permissions
RUN mkdir -p /app/prisma/data && touch /app/prisma/data/inventory.db

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app

# Fix permissions for the database directory
RUN chmod -R 755 /app/prisma/data
USER nodejs

EXPOSE 3000

CMD ["sh", "-c", "echo 'Initializing database...' && node init-db.js && echo 'Starting application...' && node src/index.js"]