import { validateRequest } from './middleware.js';
import { bulkPurchaseSchema, querySchema } from './schemas.js';

export function setupBulkPurchaseRoutes(app, prisma) {
  // Get bulk purchases with pending payments
  app.get('/api/bulk-purchases/pending-payments', validateRequest({ query: querySchema }), async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      // For SQLite, we need to use raw comparison
      const allPurchases = await prisma.bulkPurchase.findMany({
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true
        }
      });
      
      const pendingPurchaseIds = allPurchases
        .filter(purchase => purchase.totalAmount > purchase.paidAmount)
        .map(purchase => purchase.id);
      
      const where = {
        id: {
          in: pendingPurchaseIds
        }
      };
      
      // Add search filter for ID, invoice number and contact name
      if (search) {
        where.OR = [
          { id: { contains: search } },
          { invoiceNumber: { contains: search } },
          { contact: { name: { contains: search } } }
        ];
      }

      const [total, items] = await Promise.all([
        prisma.bulkPurchase.count({ where }),
        prisma.bulkPurchase.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { purchaseDate: 'desc' },
          include: {
            contact: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        }),
      ]);

      res.json({
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all bulk purchases with search and pagination
  app.get('/api/bulk-purchases', validateRequest({ query: querySchema }), async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '', contactId = '' } = req.query;

      const where = {};
      
      // Add search filter for ID, invoice number and contact name
      if (search) {
        where.OR = [
          { id: { contains: search } },
          { invoiceNumber: { contains: search } },
          { contact: { name: { contains: search } } }
        ];
      }
      
      // Add contact filter
      if (contactId) {
        where.contactId = contactId;
      }

      const [total, items] = await Promise.all([
        prisma.bulkPurchase.count({ where }),
        prisma.bulkPurchase.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { purchaseDate: 'desc' },
          include: {
            contact: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        }),
      ]);

      res.json({
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Error fetching bulk purchases:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a single bulk purchase
  app.get('/api/bulk-purchases/:id', async (req, res) => {
    try {
      const purchase = await prisma.bulkPurchase.findUnique({
        where: { id: req.params.id },
        include: {
          contact: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
      if (!purchase) {
        return res.status(404).json({ error: 'Bulk purchase not found' });
      }
      res.json(purchase);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a bulk purchase
  app.post(
    '/api/bulk-purchases',
    validateRequest({ body: bulkPurchaseSchema }),
    async (req, res) => {
      try {
        // Start a transaction
        const purchase = await prisma.$transaction(async (prisma) => {
          // Generate a unique invoice number if not provided
          let invoiceNumber = req.body.invoiceNumber;
          if (!invoiceNumber) {
            invoiceNumber = `BP-${Date.now().toString().slice(-6)}`;
          }

          // Create the bulk purchase
          const purchase = await prisma.bulkPurchase.create({
            data: {
              invoiceNumber,
              totalAmount: req.body.totalAmount,
              paidAmount: req.body.paidAmount,
              purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date(),
              contact: {
                connect: { id: req.body.contactId }
              },
              items: {
                create: req.body.items.map(item => ({
                  quantity: item.quantity,
                  purchasePrice: item.purchasePrice,
                  product: {
                    connect: { id: item.productId }
                  }
                }))
              }
            },
            include: {
              contact: true,
              items: {
                include: {
                  product: true
                }
              }
            }
          });

          // Update product quantities and purchase prices
          for (const item of req.body.items) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                quantity: {
                  increment: item.quantity
                },
                purchasePrice: item.purchasePrice
              }
            });
          }

          return purchase;
        });

        res.status(201).json(purchase);
      } catch (error) {
        console.error('Error creating bulk purchase:', error);
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Update a bulk purchase
  app.put(
    '/api/bulk-purchases/:id',
    validateRequest({ body: bulkPurchaseSchema }),
    async (req, res) => {
      try {
        const purchase = await prisma.$transaction(async (prisma) => {
          // Get the existing purchase
          const existingPurchase = await prisma.bulkPurchase.findUnique({
            where: { id: req.params.id },
            include: {
              items: true
            }
          });

          if (!existingPurchase) {
            throw new Error('Bulk purchase not found');
          }

          // Revert quantities from old purchase items
          for (const item of existingPurchase.items) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                quantity: {
                  decrement: item.quantity
                }
              }
            });
          }

          // Delete old purchase items
          await prisma.bulkPurchaseItem.deleteMany({
            where: { bulkPurchaseId: req.params.id }
          });

          // Update the purchase with new items
          const updatedPurchase = await prisma.bulkPurchase.update({
            where: { id: req.params.id },
            data: {
              totalAmount: req.body.totalAmount,
              paidAmount: req.body.paidAmount,
              purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : undefined,
              contact: {
                connect: { id: req.body.contactId }
              },
              items: {
                create: req.body.items.map(item => ({
                  quantity: item.quantity,
                  purchasePrice: item.purchasePrice,
                  product: {
                    connect: { id: item.productId }
                  }
                }))
              }
            },
            include: {
              contact: true,
              items: {
                include: {
                  product: true
                }
              }
            }
          });

          // Update product quantities and purchase prices for new items
          for (const item of req.body.items) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                quantity: {
                  increment: item.quantity
                },
                purchasePrice: item.purchasePrice
              }
            });
          }

          return updatedPurchase;
        });

        res.json(purchase);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Delete a bulk purchase
  app.delete('/api/bulk-purchases/:id', async (req, res) => {
    try {
      await prisma.$transaction(async (prisma) => {
        // Get the purchase with its items
        const purchase = await prisma.bulkPurchase.findUnique({
          where: { id: req.params.id },
          include: {
            items: true
          }
        });

        if (!purchase) {
          throw new Error('Bulk purchase not found');
        }

        // Revert quantities to products
        for (const item of purchase.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              quantity: {
                decrement: item.quantity
              }
            }
          });
        }

        // First delete all purchase items
        await prisma.bulkPurchaseItem.deleteMany({
          where: { bulkPurchaseId: req.params.id }
        });

        // Then delete the purchase
        await prisma.bulkPurchase.delete({
          where: { id: req.params.id }
        });
      });

      res.status(204).send();
    } catch (error) {
      if (error.message === 'Bulk purchase not found') {
        return res.status(404).json({ error: 'Bulk purchase not found' });
      }
      res.status(500).json({ error: error.message });
    }
  });
}