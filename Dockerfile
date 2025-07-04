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
COPY remove-sku-constraint.js ./
COPY add-returns-migration.js ./
COPY add-original-amount.js ./
COPY add-refund-fields.js ./
COPY add-discount-migration.js ./
COPY add-damaged-quantity.js ./
COPY add-low-stock-threshold.js ./
COPY add-purchase-price.js ./
COPY add-purchase-price-to-sale-item.js ./
COPY ensure-data-dir.js ./

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Generate Prisma client
RUN npx prisma generate

# Create SQLite database directory with proper permissions
RUN mkdir -p /app/prisma/data

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app

# Fix permissions for the database directory
RUN chmod -R 755 /app/prisma/data
USER nodejs

EXPOSE 3000

CMD ["sh", "-c", "node ensure-data-dir.js && echo 'Initializing database...' && node init-db.js && echo 'Adding returns tables...' && node add-returns-migration.js && echo 'Adding original amount field...' && node add-original-amount.js && echo 'Adding refund tracking...' && node add-refund-fields.js && echo 'Adding discount field...' && node add-discount-migration.js && echo 'Adding damaged quantity field...' && node add-damaged-quantity.js && echo 'Adding low stock threshold field...' && node add-low-stock-threshold.js && echo 'Adding purchase price field...' && node add-purchase-price.js && echo 'Adding purchase price to sale items...' && node add-purchase-price-to-sale-item.js && echo 'Handling migrations...' && (npx prisma migrate resolve --applied 20241201000000_add_discount_to_sales || echo 'Migration already handled') && (npx prisma migrate resolve --applied 20241201000001_add_damaged_quantity || echo 'Migration already handled') && echo 'Starting application...' && node src/index.js"]