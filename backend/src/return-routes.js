import { validateRequest } from './middleware.js';
import { z } from 'zod';

const returnItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive"),
});

const returnSchema = z.object({
  saleId: z.string().min(1, "Sale is required"),
  items: z.array(returnItemSchema).min(1, "At least one item is required"),
  reason: z.string().optional(),
  removeFromStock: z.boolean().optional(),
});

export function setupReturnRoutes(app, prisma) {
  // Create a return
  app.post('/api/returns', validateRequest({ body: returnSchema }), async (req, res) => {
    try {
      const returnData = await prisma.$transaction(async (prisma) => {
        // Generate return number
        const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
        
        // Calculate total amount
        const totalAmount = req.body.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create return
        const saleReturn = await prisma.saleReturn.create({
          data: {
            returnNumber,
            totalAmount,
            reason: req.body.reason,
            saleId: req.body.saleId,
            items: {
              create: req.body.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
              }))
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            sale: true
          }
        });

        // Update product quantities based on removeFromStock flag
        for (const item of req.body.items) {
          if (req.body.removeFromStock) {
            // Remove from stock (decrement)
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                quantity: {
                  decrement: item.quantity
                }
              }
            });
          } else {
            // Add back to stock (increment)
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                quantity: {
                  increment: item.quantity
                }
              }
            });
          }
        }

        // Update sale total amount (subtract returned amount)
        await prisma.sale.update({
          where: { id: req.body.saleId },
          data: {
            totalAmount: {
              decrement: totalAmount
            }
          }
        });

        return saleReturn;
      });

      res.status(201).json(returnData);
    } catch (error) {
      console.error('Return creation error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get all returns
  app.get('/api/returns', async (req, res) => {
    try {
      const { search = '', page = 1, limit = 10 } = req.query;
      
      const where = search ? {
        OR: [
          { returnNumber: { contains: search } },
          { sale: { billNumber: { contains: search } } }
        ]
      } : {};
      
      const [total, returns] = await Promise.all([
        prisma.saleReturn.count({ where }),
        prisma.saleReturn.findMany({
          where,
          skip: (page - 1) * limit,
          take: parseInt(limit),
          include: {
            items: {
              include: {
                product: true
              }
            },
            sale: true
          },
          orderBy: { returnDate: 'desc' }
        })
      ]);

      res.json({ 
        items: returns,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get returns for a specific sale
  app.get('/api/sales/:saleId/returns', async (req, res) => {
    try {
      const returns = await prisma.saleReturn.findMany({
        where: { saleId: req.params.saleId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: { returnDate: 'desc' }
      });

      res.json({ items: returns });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}