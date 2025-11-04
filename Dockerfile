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
RUN npm install --omit=dev && npm cache clean --force

# Copy backend source
COPY backend/src ./src
COPY backend/prisma ./prisma
COPY backend/.env ./.env
COPY init-db.js ./
COPY ensure-data-dir.js ./
COPY add-description-to-sales.js ./
COPY migrate-to-decimal.js ./
COPY add-remaining-amount.js ./
COPY add-exchange-items.js ./

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Generate Prisma client
RUN npx prisma generate

# Create SQLite database directory with proper permissions
RUN mkdir -p /app/prisma/data

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Fix permissions before switching user
RUN chown -R nodejs:nodejs /app
RUN chmod -R 755 /app/prisma
RUN chmod -R 777 /app/prisma/data

USER nodejs

EXPOSE 3000

CMD ["sh", "-c", "node ensure-data-dir.js && echo 'Initializing database...' && node init-db.js && echo 'Adding exchange items support...' && node add-exchange-items.js && echo 'Regenerating Prisma client...' && npx prisma generate && echo 'Starting application...' && node src/index.js"]