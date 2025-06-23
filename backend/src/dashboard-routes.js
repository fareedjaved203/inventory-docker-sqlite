import { validateRequest } from './middleware.js';

export function setupDashboardRoutes(app, prisma) {
  // Get enhanced dashboard stats
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const yearAgo = new Date(today);
      yearAgo.setDate(today.getDate() - 365);

      const [
        salesToday,
        salesLast7Days,
        salesLast30Days,
        salesLast365Days,
        totalPurchaseDueAmount,
        totalSalesDueAmount
      ] = await Promise.all([
        // Sales Today
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: {
            saleDate: {
              gte: today
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
        
        // Total Due Amount (Sales) - Get all and filter in JS
        prisma.sale.findMany({
          select: {
            totalAmount: true,
            paidAmount: true
          }
        })
      ]);

      res.json({
        salesToday: Number(salesToday._sum.totalAmount || 0),
        salesLast7Days: Number(salesLast7Days._sum.totalAmount || 0),
        salesLast30Days: Number(salesLast30Days._sum.totalAmount || 0),
        salesLast365Days: Number(salesLast365Days._sum.totalAmount || 0),
        totalPurchaseDueAmount: totalPurchaseDueAmount
          .filter(p => Number(p.totalAmount) > Number(p.paidAmount))
          .reduce((sum, p) => sum + Number(p.totalAmount - p.paidAmount), 0),
        totalSalesDueAmount: totalSalesDueAmount
          .filter(s => Number(s.totalAmount) > Number(s.paidAmount))
          .reduce((sum, s) => sum + Number(s.totalAmount - s.paidAmount), 0)
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: error.message });
    }
  });
}