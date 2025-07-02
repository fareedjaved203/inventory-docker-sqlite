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
        totalSalesDueAmount,
        totalDueCredits
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
        }).catch(() => [])
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
          .reduce((sum, credit) => sum + credit, 0)
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: error.message });
    }
  });
}