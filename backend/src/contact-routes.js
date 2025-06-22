import { validateRequest } from './middleware.js';
import { contactSchema, contactUpdateSchema, querySchema } from './schemas.js';

export function setupContactRoutes(app, prisma) {
  // Get all contacts with search and pagination
  app.get('/api/contacts', validateRequest({ query: querySchema }), async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      const where = search
        ? {
            OR: [
              { name: { contains: search } },
              { address: { contains: search } },
              { phoneNumber: { contains: search } },
            ],
          }
        : {};

      const [total, items] = await Promise.all([
        prisma.contact.count({ where }),
        prisma.contact.findMany({
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
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get a single contact
  app.get('/api/contacts/:id', async (req, res) => {
    try {
      const contact = await prisma.contact.findUnique({
        where: { id: req.params.id },
      });

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      res.json({
        ...contact,
        id: contact.id.toString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new contact
  app.post(
    '/api/contacts',
    validateRequest({ body: contactSchema }),
    async (req, res) => {
      try {
        // Check if contact with same name exists
        const existingContact = await prisma.contact.findFirst({
          where: { name: req.body.name }
        });

        if (existingContact) {
          return res.status(400).json({ error: 'A contact with this name already exists' });
        }

        const contact = await prisma.contact.create({
          data: req.body,
        });

        res.status(201).json({
          ...contact,
          id: contact.id.toString(),
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Update a contact
  app.put(
    '/api/contacts/:id',
    validateRequest({ body: contactUpdateSchema }),
    async (req, res) => {
      try {
        // Check if contact with same name exists (excluding current contact)
        if (req.body.name) {
          const existingContact = await prisma.contact.findFirst({
            where: {
              name: req.body.name,
              NOT: {
                id: req.params.id
              }
            }
          });

          if (existingContact) {
            return res.status(400).json({ error: 'A contact with this name already exists' });
          }
        }

        const contact = await prisma.contact.update({
          where: { id: req.params.id },
          data: req.body,
        });

        res.json({
          ...contact,
          id: contact.id.toString(),
        });
      } catch (error) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Contact not found' });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Delete a contact
  app.delete('/api/contacts/:id', async (req, res) => {
    try {
      await prisma.contact.delete({
        where: { id: req.params.id },
      });
      
      res.status(204).send();
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Contact not found' });
      }
      res.status(500).json({ error: error.message });
    }
  });
}