import { validateRequest } from './middleware.js';
import { z } from 'zod';

const returnItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().min(0, "Quantity must be non-negative"),
  price: z.number().positive("Price must be positive"),
});

const returnSchema = z.object({
  saleId: z.string().min(1, "Sale is required"),
  items: z.array(returnItemSchema).min(1, "At least one item is required"),
  reason: z.string().optional(),
  removeFromStock: z.boolean().optional(),
  refundAmount: z.number().min(0).optional(),
}).refine(data => data.items.some(item => item.quantity > 0), {
  message: "At least one item must have a positive quantity",
  path: ["items"]
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
        
        // Filter out items with zero quantity
        const validItems = req.body.items.filter(item => item.quantity > 0);
        
        // Create return
        const saleReturn = await prisma.saleReturn.create({
          data: {
            returnNumber,
            totalAmount,
            reason: req.body.reason,
            refundAmount: req.body.refundAmount || 0,
            saleId: req.body.saleId,
            items: {
              create: validItems.map(item => ({
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
        for (const item of validItems) {
          if (req.body.removeFromStock) {
            // Remove from stock (decrement) - ensure quantity doesn't go below 0
            const product = await prisma.product.findUnique({
              where: { id: item.productId }
            });
            
            if (product && product.quantity >= item.quantity) {
              await prisma.product.update({
                where: { id: item.productId },
                data: {
                  quantity: {
                    decrement: item.quantity
                  }
                }
              });
            } else {
              // Set to 0 if would go negative
              await prisma.product.update({
                where: { id: item.productId },
                data: {
                  quantity: 0
                }
              });
            }
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

        // Note: We don't modify the original sale total amount
        // The original sale amount remains unchanged for record keeping

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

  // Mark refund as paid
  app.post('/api/returns/:returnId/pay-credit', async (req, res) => {
    try {
      const { returnId } = req.params;
      const { amount } = req.body;
      
      // Update the return record to mark refund as paid
      const updatedReturn = await prisma.saleReturn.update({
        where: { id: returnId },
        data: {
          refundPaid: true,
          refundAmount: amount || undefined,
          refundDate: new Date()
        }
      });
      
      res.json(updatedReturn);
    } catch (error) {
      console.error('Error marking refund as paid:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Pay direct credit refund
  app.post('/api/sales/:saleId/pay-credit', async (req, res) => {
    try {
      const { saleId } = req.params;
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid refund amount is required' });
      }
      
      // Create a dummy return record for tracking the refund
      const returnNumber = `REF-${Date.now().toString().slice(-6)}`;
      
      const creditReturn = await prisma.saleReturn.create({
        data: {
          returnNumber,
          totalAmount: 0, // No items returned
          refundAmount: amount,
          refundPaid: true,
          refundDate: new Date(),
          reason: 'Credit balance refund',
          saleId,
          items: { create: [] } // No items
        }
      });
      
      res.json(creditReturn);
    } catch (error) {
      console.error('Error processing credit refund:', error);
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

  // Mark refund as paid
  app.post('/api/returns/:returnId/pay-credit', async (req, res) => {
    try {
      const returnRecord = await prisma.saleReturn.update({
        where: { id: req.params.returnId },
        data: {
          refundPaid: true,
          refundDate: new Date()
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

      res.json(returnRecord);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}