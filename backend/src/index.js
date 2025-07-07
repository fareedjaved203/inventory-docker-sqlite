import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { productSchema, productUpdateSchema, querySchema } from './schemas.js';
import { setupContactRoutes } from './contact-routes.js';
import { setupSalesRoutes } from './sales-routes.js';
import { setupBulkPurchaseRoutes } from './bulk-purchase-routes.js';
import { setupDashboardRoutes } from './dashboard-routes.js';
import { setupUserRoutes } from './user-routes.js';
import { setupShopSettingsRoutes } from './shop-settings-routes.js';
import { setupReturnRoutes } from './return-routes.js';
import { setupLoanRoutes } from './loan-routes.js';
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

// Add BigInt serialization support
BigInt.prototype.toJSON = function() {
  return Number(this);
};

app.use(cors());
app.use(express.json());

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Setup routes
setupContactRoutes(app, prisma);
setupSalesRoutes(app, prisma);
setupBulkPurchaseRoutes(app, prisma);
setupDashboardRoutes(app, prisma);
setupUserRoutes(app, prisma);
setupShopSettingsRoutes(app, prisma);
setupReturnRoutes(app, prisma);
setupLoanRoutes(app, prisma);

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
        id: item.id.toString(),
        price: Number(item.price),
        quantity: Number(item.quantity)
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
    const { page = 1, limit = 10, search = '' } = req.query;
    
    // Get all products and filter by dynamic threshold
    const allProducts = await prisma.product.findMany();
    let lowStockProducts = allProducts.filter(product => 
      Number(product.quantity) <= Number(product.lowStockThreshold || 10)
    );
    
    // Apply search filter
    if (search) {
      lowStockProducts = lowStockProducts.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(search.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // Apply pagination
    const total = lowStockProducts.length;
    const items = lowStockProducts
      .sort((a, b) => Number(a.quantity) - Number(b.quantity))
      .slice((page - 1) * limit, page * limit);

    res.json({
      items: items.map(item => ({
        ...item,
        price: Number(item.price),
        quantity: Number(item.quantity),
        lowStockThreshold: Number(item.lowStockThreshold || 10)
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get damaged products
app.get('/api/products/damaged', validateRequest({ query: querySchema }), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Check if damagedQuantity column exists
    try {
      const where = {
        damagedQuantity: {
          gt: 0,
        },
      };

      const [total, items] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { updatedAt: 'desc' },
        }),
      ]);

      res.json({
        items: items.map(item => ({
          ...item,
          price: Number(item.price),
          quantity: Number(item.damagedQuantity || 0)
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (columnError) {
      // If damagedQuantity column doesn't exist, return empty result
      res.json({
        items: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark product as damaged
app.post('/api/products/:id/damage', async (req, res) => {
  try {
    const { quantity } = req.body;
    const productId = req.params.id;
    
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (quantity > product.quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    try {
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          quantity: { decrement: quantity },
          damagedQuantity: { increment: quantity }
        }
      });
      
      res.json({
        ...updatedProduct,
        price: Number(updatedProduct.price),
        quantity: Number(updatedProduct.quantity),
        damagedQuantity: Number(updatedProduct.damagedQuantity || 0)
      });
    } catch (columnError) {
      // If damagedQuantity column doesn't exist, just decrement quantity
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          quantity: { decrement: quantity }
        }
      });
      
      res.json({
        ...updatedProduct,
        price: Number(updatedProduct.price),
        quantity: Number(updatedProduct.quantity),
        damagedQuantity: 0
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore damaged product
app.post('/api/products/:id/restore', async (req, res) => {
  try {
    const { quantity } = req.body;
    const productId = req.params.id;
    
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    try {
      const restoreQty = quantity || product.damagedQuantity || 0;
      
      if (restoreQty > (product.damagedQuantity || 0)) {
        return res.status(400).json({ error: 'Cannot restore more than damaged quantity' });
      }
      
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          quantity: { increment: restoreQty },
          damagedQuantity: { decrement: restoreQty }
        }
      });
      
      res.json({
        ...updatedProduct,
        price: Number(updatedProduct.price),
        quantity: Number(updatedProduct.quantity),
        damagedQuantity: Number(updatedProduct.damagedQuantity || 0)
      });
    } catch (columnError) {
      // If damagedQuantity column doesn't exist, return error
      res.status(400).json({ error: 'Damaged items feature not available' });
    }
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
      id: product.id.toString(),
      price: Number(product.price),
      quantity: Number(product.quantity)
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
      // Check for existing product with same name
      const existingProduct = await prisma.product.findFirst({
        where: { name: req.body.name }
      });
      
      if (existingProduct) {
        return res.status(400).json({ error: 'Product name must be unique' });
      }
      
      const product = await prisma.product.create({
        data: req.body,
      });
      res.status(201).json({
        ...product,
        id: product.id.toString(),
        price: Number(product.price),
        quantity: Number(product.quantity)
      });
    } catch (error) {
      console.error('Product creation error:', error);
      if (error.code === 'P2002') {
        console.error('Constraint violation details:', error.meta);
        const target = error.meta?.target;
        if (target && target.includes('name')) {
          return res.status(400).json({ error: 'Product name must be unique' });
        }
        if (target && target.includes('sku')) {
          return res.status(400).json({ error: 'SKU must be unique' });
        }
        return res.status(400).json({ error: 'Duplicate value detected' });
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
      // Check for existing product with same name (excluding current product)
      if (req.body.name) {
        const existingProduct = await prisma.product.findFirst({
          where: {
            name: req.body.name,
            NOT: { id: req.params.id }
          }
        });
        
        if (existingProduct) {
          return res.status(400).json({ error: 'Product name must be unique' });
        }
      }
      
      const product = await prisma.product.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({
        ...product,
        id: product.id.toString(),
        price: Number(product.price),
        quantity: Number(product.quantity)
      });
    } catch (error) {
      console.error('Product update error:', error);
      if (error.code === 'P2002') {
        console.error('Constraint violation details:', error.meta);
        const target = error.meta?.target;
        if (target && target.includes('name')) {
          return res.status(400).json({ error: 'Product name must be unique' });
        }
        if (target && target.includes('sku')) {
          return res.status(400).json({ error: 'SKU must be unique' });
        }
        return res.status(400).json({ error: 'Duplicate value detected' });
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
      prisma.product.findMany().then(products => 
        products.filter(product => 
          Number(product.quantity) <= Number(product.lowStockThreshold || 10)
        ).length
      ),
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
      }).then(purchases => purchases.filter(p => Number(p.totalAmount) > Number(p.paidAmount)).length),
    ]);

    res.json({
      totalProducts,
      totalInventory: totalInventory._sum.quantity || 0,
      lowStock,
      totalSales: Number(totalSales._sum.totalAmount || 0),
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