import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { productSchema, productUpdateSchema, querySchema } from './schemas.js';
import { setupVendorRoutes } from './vendor-routes.js';
import { setupSalesRoutes } from './sales-routes.js';
import { setupBulkPurchaseRoutes } from './bulk-purchase-routes.js';
import { setupDashboardRoutes } from './dashboard-routes.js';
import { setupUserRoutes } from './user-routes.js';
import { setupShopSettingsRoutes } from './shop-settings-routes.js';
import { validateRequest } from './middleware.js';

dotenv.config();

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Setup routes
setupVendorRoutes(app, prisma);
setupSalesRoutes(app, prisma);
setupBulkPurchaseRoutes(app, prisma);
setupDashboardRoutes(app, prisma);
setupUserRoutes(app, prisma);
setupShopSettingsRoutes(app, prisma);

// Get all products with search and pagination
app.get('/api/products', validateRequest({ query: querySchema }), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
            { sku: { contains: search } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      items: items.map(item => ({
        ...item,
        id: item.id.toString()
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock products
app.get('/api/products/low-stock', validateRequest({ query: querySchema }), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const where = {
      quantity: {
        lte: 10,
      },
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { quantity: 'asc' },
      }),
    ]);

    res.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({
      ...product,
      id: product.id.toString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a product
app.post(
  '/api/products',
  validateRequest({ body: productSchema }),
  async (req, res) => {
    try {
      const product = await prisma.product.create({
        data: req.body,
      });
      res.status(201).json({
        ...product,
        id: product.id.toString()
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'SKU must be unique' });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

// Update a product
app.put(
  '/api/products/:id',
  validateRequest({ body: productUpdateSchema }),
  async (req, res) => {
    try {
      const product = await prisma.product.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({
        ...product,
        id: product.id.toString()
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'SKU must be unique' });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete a product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        error: 'This product cannot be deleted because it is referenced in sales records. Please remove all associated sales records first.'
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
app.get('/api/dashboard', async (req, res) => {
  try {
    const [totalProducts, totalInventory, lowStock, totalSales, recentSales, pendingPayments] = await Promise.all([
      prisma.product.count(),
      prisma.product.aggregate({
        _sum: {
          quantity: true,
        },
      }),
      prisma.product.count({
        where: {
          quantity: {
            lte: 10,
          },
        },
      }),
      prisma.sale.aggregate({
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.sale.findMany({
        take: 5,
        orderBy: { saleDate: 'desc' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.bulkPurchase.findMany({
        select: {
          totalAmount: true,
          paidAmount: true
        }
      }).then(purchases => purchases.filter(p => p.totalAmount > p.paidAmount).length),
    ]);

    res.json({
      totalProducts,
      totalInventory: totalInventory._sum.quantity || 0,
      lowStock,
      totalSales: totalSales._sum.totalAmount || 0,
      recentSales,
      pendingPayments,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all handler for React Router (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});