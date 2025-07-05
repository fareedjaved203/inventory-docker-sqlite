import { validateRequest } from './middleware.js';

export function setupDashboardRoutes(app, prisma) {
  // Get enhanced dashboard stats
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      // Get current Pakistan time using Asia/Karachi timezone
      const now = new Date();
      const pakistanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
      const todayPakistan = new Date(pakistanTime.getFullYear(), pakistanTime.getMonth(), pakistanTime.getDate(), 0, 0, 0, 0);
      
      const sevenDaysAgo = new Date(todayPakistan.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(todayPakistan.getTime() - 30 * 24 * 60 * 60 * 1000);
      const yearAgo = new Date(todayPakistan.getTime() - 365 * 24 * 60 * 60 * 1000);

      const [
        salesToday,
        salesLast7Days,
        salesLast30Days,
        salesLast365Days,
        totalPurchaseDueAmount,
        totalSalesDueAmount,
        totalDueCredits,
        profitToday,
        profitLast7Days,
        profitLast30Days,
        profitLast365Days
      ] = await Promise.all([
        // Sales Today
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: {
            saleDate: {
              gte: todayPakistan,
              lt: new Date(todayPakistan.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Sales Last 7 Days
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: {
            saleDate: {
              gte: sevenDaysAgo
            }
          }
        }),
        
        // Sales Last 30 Days
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: {
            saleDate: {
              gte: thirtyDaysAgo
            }
          }
        }),
        
        // Sales Last 365 Days
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: {
            saleDate: {
              gte: yearAgo
            }
          }
        }),
        
        // Total Due Amount (Bulk Purchases) - Get all and filter in JS
        prisma.bulkPurchase.findMany({
          select: {
            totalAmount: true,
            paidAmount: true
          }
        }),
        
        // Total Due Amount (Sales) - Get all with returns and filter in JS
        prisma.sale.findMany({
          include: {
            returns: true
          }
        }),
        
        // Total Due Credits (Sales with credit balance)
        prisma.sale.findMany({
          include: {
            returns: true
          }
        }).catch(() => []),
        
        // Profit Today
        prisma.sale.findMany({
          where: {
            saleDate: {
              gte: todayPakistan,
              lt: new Date(todayPakistan.getTime() + 24 * 60 * 60 * 1000)
            }
          },
          include: {
            items: true
          }
        }),
        
        // Profit Last 7 Days
        prisma.sale.findMany({
          where: {
            saleDate: {
              gte: sevenDaysAgo
            }
          },
          include: {
            items: true
          }
        }),
        
        // Profit Last 30 Days
        prisma.sale.findMany({
          where: {
            saleDate: {
              gte: thirtyDaysAgo
            }
          },
          include: {
            items: true
          }
        }),
        
        // Profit Last 365 Days
        prisma.sale.findMany({
          where: {
            saleDate: {
              gte: yearAgo
            }
          },
          include: {
            items: true
          }
        })
      ]);

      // Calculate profit for each period using stored purchase prices
      const calculateProfit = (sales) => {
        return sales.reduce((totalProfit, sale) => {
          const saleProfit = sale.items.reduce((itemProfit, item) => {
            const sellPrice = Number(item.price);
            const purchasePrice = Number(item.purchasePrice || 0);
            const quantity = Number(item.quantity);
            
            // Only calculate profit if purchase price is set (> 0)
            if (purchasePrice > 0) {
              return itemProfit + ((sellPrice - purchasePrice) * quantity);
            }
            return itemProfit;
          }, 0);
          return totalProfit + saleProfit;
        }, 0);
      };

      res.json({
        salesToday: Number(salesToday._sum.totalAmount || 0),
        salesLast7Days: Number(salesLast7Days._sum.totalAmount || 0),
        salesLast30Days: Number(salesLast30Days._sum.totalAmount || 0),
        salesLast365Days: Number(salesLast365Days._sum.totalAmount || 0),
        totalPurchaseDueAmount: totalPurchaseDueAmount
          .filter(p => Number(p.totalAmount) > Number(p.paidAmount))
          .reduce((sum, p) => sum + Number(p.totalAmount - p.paidAmount), 0),
        totalSalesDueAmount: totalSalesDueAmount
          .map(sale => {
            const originalAmount = Number(sale.totalAmount);
            const returnedAmount = (sale.returns || []).reduce((sum, ret) => sum + Number(ret.totalAmount), 0);
            const totalRefunded = (sale.returns || []).reduce((sum, ret) => sum + (ret.refundPaid ? Number(ret.refundAmount || 0) : 0), 0);
            const netAmount = Math.max(originalAmount - returnedAmount, 0);
            const balance = netAmount - Number(sale.paidAmount || 0) + totalRefunded;
            return balance > 0 ? balance : 0;
          })
          .reduce((sum, due) => sum + due, 0),
        totalDueCredits: (totalDueCredits || [])
          .map(sale => {
            const originalAmount = Number(sale.totalAmount);
            const returnedAmount = (sale.returns || []).reduce((sum, ret) => sum + Number(ret.totalAmount), 0);
            const totalRefunded = (sale.returns || []).reduce((sum, ret) => sum + (ret.refundPaid ? Number(ret.refundAmount || 0) : 0), 0);
            const netAmount = Math.max(originalAmount - returnedAmount, 0);
            const balance = netAmount - Number(sale.paidAmount || 0) + totalRefunded;
            return balance < 0 ? Math.abs(balance) : 0;
          })
          .reduce((sum, credit) => sum + credit, 0),
        profitToday: calculateProfit(profitToday),
        profitLast7Days: calculateProfit(profitLast7Days),
        profitLast30Days: calculateProfit(profitLast30Days),
        profitLast365Days: calculateProfit(profitLast365Days)
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: error.message });
    }
  });
}