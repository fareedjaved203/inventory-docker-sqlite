import { validateRequest } from './middleware.js';
import { Prisma } from '@prisma/client';
import { saleSchema, querySchema } from './schemas.js';

function parseDateDDMMYYYY(dateString) {
  if (!dateString) {
    return null;
  }
  
  // Add logging to help debug the input
  console.log('Attempting to parse date:', dateString);
  
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JavaScript Date
    const year = parseInt(parts[2], 10);

    // Log the parsed components
    console.log('Parsed components:', { day, month: month + 1, year });

    // Validate the ranges of the components before creating the date
    if (day >= 1 && day <= 31 && 
        month >= 0 && month <= 11 && 
        year >= 1900 && year <= 9999) {
      
      // Create a UTC date object for the beginning of the day (00:00:00.000Z)
      const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

      // Validate if the date components actually form a valid date
      // This checks for cases like "31/02/2023" which would result in March 2nd
      if (date.getUTCFullYear() === year && 
          date.getUTCMonth() === month && 
          date.getUTCDate() === day) {
        
        console.log('Successfully parsed date:', date.toISOString());
        return date;
      }
    }
  }
  
  console.log('Failed to parse date:', dateString);
  return null; // Return null for invalid date strings or incorrect format
}

export function setupSalesRoutes(app, prisma) {
  // Create a sale
  app.post(
    '/api/sales',
    validateRequest({ body: saleSchema }),
    async (req, res) => {
      try {
        // Start a transaction
        const sale = await prisma.$transaction(async (prisma) => {
          // Generate a unique 7-digit bill number
          let billNumber;
          let isUnique = false;
          
          while (!isUnique) {
            // Generate a random 7-digit number
            billNumber = Math.floor(1000000 + Math.random() * 9000000).toString();
            
            // Check if it's unique
            const existingSale = await prisma.sale.findUnique({
              where: { billNumber }
            });
            
            if (!existingSale) {
              isUnique = true;
            }
          }

          // Create the sale with the unique bill number
          const sale = await prisma.sale.create({
            data: {
              billNumber,
              totalAmount: req.body.totalAmount,
              paidAmount: req.body.paidAmount || 0,
              ...(req.body.vendorId && { vendor: { connect: { id: req.body.vendorId } } }),
              items: {
                create: req.body.items.map(item => ({
                  quantity: item.quantity,
                  price: item.price,
                  product: {
                    connect: { id: item.productId }
                  }
                }))
              }
            },
            include: {
              items: {
                include: {
                  product: true
                }
              },
              vendor: true
            }
          });

          // Update product quantities
          for (const item of req.body.items) {
            const product = await prisma.product.findUnique({
              where: { id: item.productId }
            });

            if (!product) {
              throw new Error(`Product with ID ${item.productId} not found`);
            }

            if (product.quantity < item.quantity) {
              throw new Error(`Insufficient stock for product ${product.name}`);
            }

            await prisma.product.update({
              where: { id: item.productId },
              data: {
                quantity: {
                  decrement: item.quantity
                }
              }
            });
          }

          return sale;
        });

        res.status(201).json(sale);
      } catch (error) {
        console.log(error)
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Get sales with pending payments
  app.get('/api/sales/pending-payments', validateRequest({ query: querySchema }), async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      // For SQLite, we need to use raw comparison
      const allSales = await prisma.sale.findMany({
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true
        }
      });
      
      const pendingSaleIds = allSales
        .filter(sale => sale.totalAmount > sale.paidAmount)
        .map(sale => sale.id);
      
      const where = {
        id: {
          in: pendingSaleIds
        }
      };
      
      // Add search filter for bill number
      if (search) {
        where.OR = [
          { billNumber: { contains: search } }
        ];
      }

      const [total, items] = await Promise.all([
        prisma.sale.count({ where }),
        prisma.sale.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { saleDate: 'desc' },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            vendor: true,
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

  // Get all sales with search and pagination
  app.get('/api/sales', validateRequest({ query: querySchema }), async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      // Initialize the where clause for Prisma
      let where = {};

      // Handle date filtering
      if (search) {
        // First try to parse as a date
        const parsedSearchDate = parseDateDDMMYYYY(search);
        
        if (parsedSearchDate instanceof Date && !isNaN(parsedSearchDate.getTime())) {
          // Create a range for the entire day in UTC
          const startOfDay = new Date(Date.UTC(
            parsedSearchDate.getUTCFullYear(),
            parsedSearchDate.getUTCMonth(),
            parsedSearchDate.getUTCDate(),
            0, 0, 0, 0
          ));
          
          const endOfDay = new Date(Date.UTC(
            parsedSearchDate.getUTCFullYear(),
            parsedSearchDate.getUTCMonth(),
            parsedSearchDate.getUTCDate(),
            23, 59, 59, 999
          ));

          where = {
            saleDate: {
              gte: startOfDay,
              lt: new Date(endOfDay.getTime() + 1), // Add 1ms to ensure we catch everything
            },
          };
        } else {
          // If not a date, search by bill number
          where = {
            billNumber: {
              contains: search
            }
          };
        }
      }

      // Execute Prisma queries concurrently for total count and items
      const [total, items] = await Promise.all([
        prisma.sale.count({ where }),
        prisma.sale.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { saleDate: 'desc' },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            vendor: true,
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
      console.error('Error fetching sales:', error);
      res.status(500).json({ error: 'An internal server error occurred.' });
    }
  });

  // Get a single sale
  app.get('/api/sales/:id', async (req, res) => {
    try {
      const sale = await prisma.sale.findUnique({
        where: { id: req.params.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          vendor: true,
        },
      });
      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update a sale
  app.put(
    '/api/sales/:id',
    validateRequest({ body: saleSchema }),
    async (req, res) => {
      try {
        const sale = await prisma.$transaction(async (prisma) => {
          // Get the existing sale
          const existingSale = await prisma.sale.findUnique({
            where: { id: req.params.id },
            include: {
              items: true
            }
          });

          if (!existingSale) {
            throw new Error('Sale not found');
          }

          // Restore quantities from old sale items
          for (const item of existingSale.items) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                quantity: {
                  increment: item.quantity
                }
              }
            });
          }

          // Delete old sale items
          await prisma.saleItem.deleteMany({
            where: { saleId: req.params.id }
          });

          // Update the sale with new items
          const updatedSale = await prisma.sale.update({
            where: { id: req.params.id },
            data: {
              totalAmount: req.body.totalAmount,
              paidAmount: req.body.paidAmount || 0,
              ...(req.body.vendorId ? { vendor: { connect: { id: req.body.vendorId } } } : { vendor: { disconnect: true } }),
              items: {
                create: req.body.items.map(item => ({
                  quantity: item.quantity,
                  price: item.price,
                  product: {
                    connect: { id: item.productId }
                  }
                }))
              }
            },
            include: {
              items: {
                include: {
                  product: true
                }
              },
              vendor: true
            }
          });

          // Update product quantities for new items
          for (const item of req.body.items) {
            const product = await prisma.product.findUnique({
              where: { id: item.productId }
            });

            if (!product) {
              throw new Error(`Product with ID ${item.productId} not found`);
            }

            if (product.quantity < item.quantity) {
              throw new Error(`Insufficient stock for product ${product.name}`);
            }

            await prisma.product.update({
              where: { id: item.productId },
              data: {
                quantity: {
                  decrement: item.quantity
                }
              }
            });
          }

          return updatedSale;
        });

        res.json(sale);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Delete a sale
  app.delete('/api/sales/:id', async (req, res) => {
    try {
      await prisma.$transaction(async (prisma) => {
        // Get the sale with its items
        const sale = await prisma.sale.findUnique({
          where: { id: req.params.id },
          include: {
            items: true
          }
        });

        if (!sale) {
          throw new Error('Sale not found');
        }

        // Restore quantities to products
        for (const item of sale.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              quantity: {
                increment: item.quantity
              }
            }
          });
        }

        // First delete all sale items
        await prisma.saleItem.deleteMany({
          where: { saleId: req.params.id }
        });

        // Then delete the sale
        await prisma.sale.delete({
          where: { id: req.params.id }
        });
      });

      res.status(204).send();
    } catch (error) {
      if (error.message === 'Sale not found') {
        return res.status(404).json({ error: 'Sale not found' });
      }
      res.status(500).json({ error: error.message });
    }
  });


  // Update dashboard stats to include sales data
// Cache for sales analytics data
const analyticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  // Get sales analytics data
app.get('/api/sales-analytics', async (req, res) => {
  try {
    const { startDate, endDate, interval = 'daily' } = req.query;

    // Validate interval
    const validIntervals = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({ error: 'Invalid interval. Must be one of: daily, weekly, monthly, yearly' });
    }

    // Default date ranges
    let start, end;
    if (!startDate || !endDate) {
      end = new Date();
      switch (interval) {
        case 'daily':
          start = new Date(new Date().setDate(end.getDate() - 30));
          break;
        case 'weekly':
          start = new Date(new Date().setDate(end.getDate() - 90));
          break;
        case 'monthly':
          start = new Date(new Date().setMonth(end.getMonth() - 12));
          break;
        case 'yearly':
          start = new Date(new Date().setFullYear(end.getFullYear() - 5));
          break;
      }
    } else {
      start = new Date(startDate);
      end = new Date(endDate);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    if (start > end) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    const cacheKey = `${interval}-${start.toISOString()}-${end.toISOString()}`;
    const cached = analyticsCache.get(cacheKey);
    if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
      return res.json(cached.data);
    }

    // For SQLite, we'll use a simpler approach without date_range generation
    // Get all sales in the date range
    const sales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: start,
          lte: end
        }
      },
      select: {
        saleDate: true,
        totalAmount: true
      }
    });

    // Process the data based on interval
    const salesByDate = new Map();
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.saleDate);
      let groupKey;
      
      switch(interval) {
        case 'daily':
          groupKey = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate()).toISOString().split('T')[0];
          break;
        case 'weekly':
          // Get the first day of the week (Sunday)
          const firstDayOfWeek = new Date(saleDate);
          const day = saleDate.getDay();
          firstDayOfWeek.setDate(saleDate.getDate() - day);
          groupKey = firstDayOfWeek.toISOString().split('T')[0];
          break;
        case 'monthly':
          groupKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          groupKey = `${saleDate.getFullYear()}`;
          break;
      }
      
      if (!salesByDate.has(groupKey)) {
        salesByDate.set(groupKey, { total: 0, count: 0 });
      }
      
      const current = salesByDate.get(groupKey);
      current.total += Number(sale.totalAmount);
      current.count += 1;
    });
    
    // Generate all dates in the range for consistent data points
    const allDates = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      let groupKey;
      
      switch(interval) {
        case 'daily':
          groupKey = currentDate.toISOString().split('T')[0];
          allDates.push(groupKey);
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          groupKey = new Date(currentDate).toISOString().split('T')[0];
          allDates.push(groupKey);
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          groupKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          allDates.push(groupKey);
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          groupKey = `${currentDate.getFullYear()}`;
          allDates.push(groupKey);
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }
    
    // Format the final result
    const formatted = allDates.map(date => ({
      date: interval === 'daily' || interval === 'weekly' ? `${date}T00:00:00.000Z` : 
           interval === 'monthly' ? `${date}-01T00:00:00.000Z` : 
           `${date}-01-01T00:00:00.000Z`,
      total: salesByDate.has(date) ? salesByDate.get(date).total : 0,
      count: salesByDate.has(date) ? salesByDate.get(date).count : 0
    }));

    // Save to cache
    analyticsCache.set(cacheKey, {
      timestamp: Date.now(),
      data: formatted
    });

    res.json(formatted);
  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch sales analytics' });
  }
});
}