import { validateRequest } from './middleware.js';
import { z } from 'zod';

const loanTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(['GIVEN', 'TAKEN', 'RETURNED_BY_CONTACT', 'RETURNED_TO_CONTACT']),
  description: z.string().optional(),
});

export function setupLoanRoutes(app, prisma) {
  // Get loan transactions and summary for a contact
  app.get('/api/contacts/:contactId/loans', async (req, res) => {
    try {
      const { contactId } = req.params;
      
      const transactions = await prisma.loanTransaction.findMany({
        where: { contactId },
        orderBy: { date: 'desc' }
      });
      
      // Calculate totals
      const totals = transactions.reduce((acc, transaction) => {
        const amount = Number(transaction.amount);
        switch (transaction.type) {
          case 'GIVEN':
            acc.totalGiven += amount;
            break;
          case 'TAKEN':
            acc.totalTaken += amount;
            break;
          case 'RETURNED_BY_CONTACT':
            acc.totalReturnedByContact += amount;
            break;
          case 'RETURNED_TO_CONTACT':
            acc.totalReturnedToContact += amount;
            break;
        }
        return acc;
      }, {
        totalGiven: 0,
        totalTaken: 0,
        totalReturnedByContact: 0,
        totalReturnedToContact: 0
      });
      
      res.json({
        ...totals,
        transactions: transactions.map(t => ({
          ...t,
          amount: Number(t.amount)
        }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new loan transaction
  app.post('/api/contacts/:contactId/loans', validateRequest({ body: loanTransactionSchema }), async (req, res) => {
    try {
      const { contactId } = req.params;
      
      const transaction = await prisma.loanTransaction.create({
        data: {
          ...req.body,
          contactId
        }
      });
      
      res.status(201).json({
        ...transaction,
        amount: Number(transaction.amount)
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete a loan transaction
  app.delete('/api/contacts/:contactId/loans/:transactionId', async (req, res) => {
    try {
      const { contactId, transactionId } = req.params;
      
      // Verify transaction belongs to the contact
      const transaction = await prisma.loanTransaction.findFirst({
        where: {
          id: transactionId,
          contactId
        }
      });
      
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      await prisma.loanTransaction.delete({
        where: { id: transactionId }
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}