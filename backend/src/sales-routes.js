import { validateRequest } from './middleware.js';
import { Prisma } from '@prisma/client';
import { saleSchema, querySchema } from './schemas.js';

// Helper function to get current time in Pakistan and store as UTC
function getCurrentPakistanTime() {
  // Get current time in Pakistan timezone (UTC+5)
  const now = new Date();
  const pakistanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  return pakistanTime;
}

// Helper function to create date from YYYY-MM-DD string in Pakistan timezone
function createPakistanDate(dateString) {
  if (!dateString) return getCurrentPakistanTime();
  
  const [year, month, day] = dateString.split('-').map(Number);
  const pakistanTime = new Date();
  const currentPakTime = new Date(pakistanTime.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  
  // Create date in Pakistan timezone with current time
  const pakistanDate = new Date(year, month - 1, day, currentPakTime.getHours(), currentPakTime.getMinutes(), currentPakTime.getSeconds());
  return pakistanDate;
}

function parseDateDDMMYYYY(dateString) {
  if (!dateString) {
    return null;
  }
  
  console.log('Attempting to parse date:', dateString);
  
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    console.log('Parsed components:', { day, month: month + 1, year });

    if (day >= 1 && day <= 31 && 
        month >= 0 && month <= 11 && 
        year >= 1900 && year <= 9999) {
      
      const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

      if (date.getUTCFullYear() === year && 
          date.getUTCMonth() === month && 
          date.getUTCDate() === day) {
        
        console.log('Successfully parsed date:', date.toISOString());
        return date;
      }
    }
  }
  
  console.log('Failed to parse date:', dateString);
  return null;
}

export function setupSalesRoutes(app, prisma) {
  // Create a sale
  app.post(
    '/api/sales',
    validateRequest({ body: saleSchema }),
    async (req, res) => {
      try {
        const sale = await prisma.$transaction(async (prisma) => {
          let billNumber;
          let isUnique = false;
          
          while (!isUnique) {
            billNumber = Math.floor(1000000 + Math.random() * 9000000).toString();
            
            const existingSale = await prisma.sale.findUnique({
              where: { billNumber }
            });
            
            if (!existingSale) {
              isUnique = true;
            }
          }

          const saleDate = req.body.saleDate ? createPakistanDate(req.body.saleDate) : getCurrentPakistanTime();
          console.log("to create sale: ",req.body)
          // Get product details including purchase prices
          const productDetails = await Promise.all(
            req.body.items.map(item => 
              prisma.product.findUnique({
                where: { id: item.productId },
                select: { id: true, purchasePrice: true, name: true, quantity: true }
              })
            )
          );

          const sale = await prisma.sale.create({
            data: {
              billNumber,
              totalAmount: req.body.totalAmount,
              originalTotalAmount: req.body.totalAmount + (req.body.discount || 0),
              discount: req.body.discount || 0,
              paidAmount: req.body.paidAmount || 0,
              saleDate,
              ...(req.body.contactId && { contact: { connect: { id: req.body.contactId } } }),
              items: {
                create: req.body.items.map((item, index) => ({
                  quantity: item.quantity,
                  price: item.price,
                  purchasePrice: productDetails[index]?.purchasePrice || 0,
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
              contact: true
            }
          });

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

  // Get sales with credit balance (overpaid)
  app.get('/api/sales/credit-balance', validateRequest({ query: querySchema }), async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      // Get all sales with returns to calculate credit balance
      const allSales = await prisma.sale.findMany({
        include: {
          returns: {
            include: {
              items: {
                include: {
                  product: true
                }
              }
            }
          },
          items: {
            include: {
              product: true,
            },
          },
          contact: true,
        }
      });
      
      // Filter sales with credit balance (overpaid)
      const creditSales = allSales.filter(sale => {
        const originalAmount = Number(sale.totalAmount);
        const returnedAmount = (sale.returns || []).reduce((sum, ret) => sum + Number(ret.totalAmount), 0);
        const totalRefunded = (sale.returns || []).reduce((sum, ret) => sum + (ret.refundPaid ? Number(ret.refundAmount || 0) : 0), 0);
        const netAmount = originalAmount - returnedAmount;
        const balance = netAmount - Number(sale.paidAmount) + totalRefunded;
        return balance < 0; // Credit balance (overpaid)
      });
      
      // Apply search filter
      const filteredSales = search ? 
        creditSales.filter(sale => sale.billNumber.includes(search)) : 
        creditSales;
      
      // Apply pagination
      const total = filteredSales.length;
      const items = filteredSales
        .slice((page - 1) * limit, page * limit)
        .map(sale => {
          const returnedQuantities = {};
          (sale.returns || []).forEach(returnRecord => {
            (returnRecord.items || []).forEach(returnItem => {
              if (!returnedQuantities[returnItem.productId]) {
                returnedQuantities[returnItem.productId] = 0;
              }
              returnedQuantities[returnItem.productId] += Number(returnItem.quantity);
            });
          });
          
          return {
            ...sale,
            items: sale.items.map(item => ({
              ...item,
              returnedQuantity: returnedQuantities[item.productId] || 0,
              remainingQuantity: Number(item.quantity) - (returnedQuantities[item.productId] || 0)
            }))
          };
        });

      res.json({
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Error fetching credit balance sales:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get sales with pending payments
  app.get('/api/sales/pending-payments', validateRequest({ query: querySchema }), async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      // Get all sales with returns to calculate net amounts
      const allSales = await prisma.sale.findMany({
        include: {
          returns: true
        }
      });
      
      // Filter sales with pending payments based on net amounts after returns
      const pendingSales = allSales.filter(sale => {
        const originalAmount = Number(sale.totalAmount);
        const returnedAmount = (sale.returns || []).reduce((sum, ret) => sum + Number(ret.totalAmount), 0);
        const netAmount = originalAmount - returnedAmount;
        const balance = netAmount - Number(sale.paidAmount);
        return balance > 0; // Has pending payment
      });
      
      // Apply search filter
      const filteredSales = search ? 
        pendingSales.filter(sale => sale.billNumber.includes(search)) : 
        pendingSales;
      
      // Apply pagination
      const total = filteredSales.length;
      const items = filteredSales
        .slice((page - 1) * limit, page * limit)
        .map(sale => {
          const returnedQuantities = {};
          if (sale.returns && Array.isArray(sale.returns)) {
            sale.returns.forEach(returnRecord => {
              if (returnRecord && returnRecord.items && Array.isArray(returnRecord.items)) {
                returnRecord.items.forEach(returnItem => {
                  if (returnItem && returnItem.productId) {
                    if (!returnedQuantities[returnItem.productId]) {
                      returnedQuantities[returnItem.productId] = 0;
                    }
                    returnedQuantities[returnItem.productId] += Number(returnItem.quantity || 0);
                  }
                });
              }
            });
          }
          
          return {
            ...sale,
            items: sale.items?.map(item => ({
              ...item,
              returnedQuantity: returnedQuantities[item.productId] || 0,
              remainingQuantity: Number(item.quantity) - (returnedQuantities[item.productId] || 0)
            })) || []
          };
        });

      // Get full sale data for the filtered items
      const saleIds = items.map(sale => sale.id);
      const fullSales = await prisma.sale.findMany({
        where: {
          id: {
            in: saleIds
          }
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          contact: true,
          returns: {
            include: {
              items: {
                include: {
                  product: true
                }
              }
            }
          }
        },
        orderBy: { saleDate: 'desc' }
      });

      // Add returned quantities to full sales data
      const finalItems = fullSales.map(sale => {
        const returnedQuantities = {};
        if (sale.returns && Array.isArray(sale.returns)) {
          sale.returns.forEach(returnRecord => {
            if (returnRecord && returnRecord.items && Array.isArray(returnRecord.items)) {
              returnRecord.items.forEach(returnItem => {
                if (returnItem && returnItem.productId) {
                  if (!returnedQuantities[returnItem.productId]) {
                    returnedQuantities[returnItem.productId] = 0;
                  }
                  returnedQuantities[returnItem.productId] += Number(returnItem.quantity || 0);
                }
              });
            }
          });
        }
        
        return {
          ...sale,
          items: sale.items?.map(item => ({
            ...item,
            returnedQuantity: returnedQuantities[item.productId] || 0,
            remainingQuantity: Number(item.quantity) - (returnedQuantities[item.productId] || 0)
          })) || []
        };
      });

      res.json({
        items: finalItems,
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
      let date = decodeURIComponent(req.query.date || '');
      
      // Force extract date from URL if not in query
      if (!date && req.url.includes('date=')) {
        const urlMatch = req.url.match(/date=([^&]+)/);
        if (urlMatch) {
          const extractedDate = decodeURIComponent(urlMatch[1]);
          date = extractedDate;
        }
      }

      let where = {};
      let conditions = [];

      // Handle date filter (from date picker)
      if (date && date.trim() !== '') {
        const parsedDate = parseDateDDMMYYYY(date);
        if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
          const startOfDay = new Date(Date.UTC(
            parsedDate.getUTCFullYear(),
            parsedDate.getUTCMonth(),
            parsedDate.getUTCDate(),
            0, 0, 0, 0
          ));
          
          const endOfDay = new Date(Date.UTC(
            parsedDate.getUTCFullYear(),
            parsedDate.getUTCMonth(),
            parsedDate.getUTCDate(),
            23, 59, 59, 999
          ));

          conditions.push({
            saleDate: {
              gte: startOfDay,
              lt: new Date(endOfDay.getTime() + 1),
            }
          });
          console.log('Added date condition for:', date);
        }
      }

      // Handle search (bill number or contact name)
      if (search && search.trim() !== '') {
        console.log('Processing search parameter:', search);
        // Check if search looks like a date (DD/MM/YYYY) - if so, treat as date filter
        const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
        const isDateFormat = datePattern.test(search);
        
        if (isDateFormat && (!date || date.trim() === '')) {
          // Only use search as date if no separate date filter is provided
          const parsedSearchDate = parseDateDDMMYYYY(search);
          
          if (parsedSearchDate instanceof Date && !isNaN(parsedSearchDate.getTime())) {
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

            conditions.push({
              saleDate: {
                gte: startOfDay,
                lt: new Date(endOfDay.getTime() + 1),
              }
            });
            console.log('Added search date condition for:', search);
          } else {
            // If date parsing failed, search by bill number and contact name
            conditions.push({
              OR: [
                {
                  billNumber: {
                    contains: search
                  }
                },
                {
                  contact: {
                    name: {
                      contains: search
                    }
                  }
                }
              ]
            });
            console.log('Added bill/contact search for:', search);
          }
        } else {
          // Always search by bill number and contact name when not a date format or when date param exists
          conditions.push({
            OR: [
              {
                billNumber: {
                  contains: search
                }
              },
              {
                contact: {
                  name: {
                    contains: search
                  }
                }
              }
            ]
          });
          console.log('Added bill/contact search for:', search);
        }
      }

      // Combine all conditions with AND logic
      if (conditions.length > 0) {
        where = conditions.length === 1 ? conditions[0] : { AND: conditions };
      }

      const [total, salesData] = await Promise.all([
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
            contact: true,
            returns: {
              include: {
                items: {
                  include: {
                    product: true
                  }
                }
              }
            }
          },
        }),
      ]);
      
      // Add returned quantities to each sale
      const items = salesData.map(sale => {
        const returnedQuantities = {};
        if (sale.returns && Array.isArray(sale.returns)) {
          sale.returns.forEach(returnRecord => {
            if (returnRecord && returnRecord.items && Array.isArray(returnRecord.items)) {
              returnRecord.items.forEach(returnItem => {
                if (returnItem && returnItem.productId) {
                  if (!returnedQuantities[returnItem.productId]) {
                    returnedQuantities[returnItem.productId] = 0;
                  }
                  returnedQuantities[returnItem.productId] += Number(returnItem.quantity || 0);
                }
              });
            }
          });
        }
        
        return {
          ...sale,
          items: sale.items?.map(item => ({
            ...item,
            returnedQuantity: returnedQuantities[item.productId] || 0,
            remainingQuantity: Number(item.quantity) - (returnedQuantities[item.productId] || 0)
          })) || []
        };
      });

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
          contact: true,
          returns: {
            include: {
              items: {
                include: {
                  product: true
                }
              }
            }
          }
        },
      });
      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }
      
      // Calculate returned quantities for each product
      const returnedQuantities = {};
      if (sale.returns && Array.isArray(sale.returns)) {
        sale.returns.forEach(returnRecord => {
          if (returnRecord && returnRecord.items && Array.isArray(returnRecord.items)) {
            returnRecord.items.forEach(returnItem => {
              if (returnItem && returnItem.productId) {
                if (!returnedQuantities[returnItem.productId]) {
                  returnedQuantities[returnItem.productId] = 0;
                }
                returnedQuantities[returnItem.productId] += Number(returnItem.quantity || 0);
              }
            });
          }
        });
      }
      
      // Add returned quantities to sale items
      const saleWithReturns = {
        ...sale,
        items: sale.items.map(item => ({
          ...item,
          returnedQuantity: returnedQuantities[item.productId] || 0,
          remainingQuantity: Number(item.quantity) - (returnedQuantities[item.productId] || 0)
        }))
      };
      
      res.json(saleWithReturns);
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
          const existingSale = await prisma.sale.findUnique({
            where: { id: req.params.id },
            include: {
              items: true
            }
          });

          if (!existingSale) {
            throw new Error('Sale not found');
          }

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

          await prisma.saleItem.deleteMany({
            where: { saleId: req.params.id }
          });

          const saleDate = req.body.saleDate ? createPakistanDate(req.body.saleDate) : undefined;
          console.log("to update sale: ",req.body)
          
          // Get product details including purchase prices for update
          const productDetails = await Promise.all(
            req.body.items.map(item => 
              prisma.product.findUnique({
                where: { id: item.productId },
                select: { id: true, purchasePrice: true, name: true, quantity: true }
              })
            )
          );

          const updatedSale = await prisma.sale.update({
            where: { id: req.params.id },
            data: {
              totalAmount: req.body.totalAmount,
              originalTotalAmount: req.body.totalAmount + (req.body.discount || 0),
              discount: req.body.discount || 0,
              paidAmount: req.body.paidAmount || 0,
              ...(saleDate && { saleDate }),
              ...(req.body.contactId ? { contact: { connect: { id: req.body.contactId } } } : { contact: { disconnect: true } }),
              items: {
                create: req.body.items.map((item, index) => ({
                  quantity: item.quantity,
                  price: item.price,
                  purchasePrice: productDetails[index]?.purchasePrice || 0,
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
              contact: true
            }
          });

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
        const sale = await prisma.sale.findUnique({
          where: { id: req.params.id },
          include: {
            items: true,
            returns: {
              include: {
                items: true
              }
            }
          }
        });

        if (!sale) {
          throw new Error('Sale not found');
        }

        // Restore product quantities from sale items
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

        // Adjust product quantities for returned items (remove them from stock if they were added back)
        if (sale.returns && Array.isArray(sale.returns)) {
          for (const returnRecord of sale.returns) {
            if (returnRecord && returnRecord.items && Array.isArray(returnRecord.items)) {
              for (const returnItem of returnRecord.items) {
                if (returnItem && returnItem.productId) {
                  await prisma.product.update({
                    where: { id: returnItem.productId },
                    data: {
                      quantity: {
                        decrement: returnItem.quantity
                      }
                    }
                  });
                }
              }
            }
          }

          // Delete return items first
          for (const returnRecord of sale.returns) {
            if (returnRecord && returnRecord.id) {
              await prisma.saleReturnItem.deleteMany({
                where: { saleReturnId: returnRecord.id }
              });
            }
          }
        }

        // Delete returns
        await prisma.saleReturn.deleteMany({
          where: { saleId: req.params.id }
        });

        // Delete sale items
        await prisma.saleItem.deleteMany({
          where: { saleId: req.params.id }
        });

        // Delete the sale
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

const analyticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

app.get('/api/sales-analytics', async (req, res) => {
  try {
    const { startDate, endDate, interval = 'daily' } = req.query;

    const validIntervals = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({ error: 'Invalid interval. Must be one of: daily, weekly, monthly, yearly' });
    }

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

    const salesByDate = new Map();
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.saleDate);
      let groupKey;
      
      switch(interval) {
        case 'daily':
          groupKey = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate()).toISOString().split('T')[0];
          break;
        case 'weekly':
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
    
    const formatted = allDates.map(date => ({
      date: interval === 'daily' || interval === 'weekly' ? `${date}T00:00:00.000Z` : 
           interval === 'monthly' ? `${date}-01T00:00:00.000Z` : 
           `${date}-01-01T00:00:00.000Z`,
      total: salesByDate.has(date) ? salesByDate.get(date).total : 0,
      count: salesByDate.has(date) ? salesByDate.get(date).count : 0
    }));

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