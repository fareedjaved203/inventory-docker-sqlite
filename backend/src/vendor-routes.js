import { validateRequest } from './middleware.js';
import { vendorSchema, vendorUpdateSchema, querySchema } from './schemas.js';

export function setupVendorRoutes(app, prisma) {
  // Get all vendors with search and pagination
  app.get('/api/vendors', validateRequest({ query: querySchema }), async (req, res) => {
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
        prisma.vendor.count({ where }),
        prisma.vendor.findMany({
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

  // Get a single vendor
  app.get('/api/vendors/:id', async (req, res) => {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: req.params.id },
      });

      if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
      }

      res.json({
        ...vendor,
        id: vendor.id.toString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new vendor
  app.post(
    '/api/vendors',
    validateRequest({ body: vendorSchema }),
    async (req, res) => {
      try {
        // Check if vendor with same name exists
        const existingVendor = await prisma.vendor.findFirst({
          where: { name: req.body.name }
        });

        if (existingVendor) {
          return res.status(400).json({ error: 'A vendor with this name already exists' });
        }

        const vendor = await prisma.vendor.create({
          data: req.body,
        });

        res.status(201).json({
          ...vendor,
          id: vendor.id.toString(),
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Update a vendor
  app.put(
    '/api/vendors/:id',
    validateRequest({ body: vendorUpdateSchema }),
    async (req, res) => {
      try {
        // Check if vendor with same name exists (excluding current vendor)
        if (req.body.name) {
          const existingVendor = await prisma.vendor.findFirst({
            where: {
              name: req.body.name,
              NOT: {
                id: req.params.id
              }
            }
          });

          if (existingVendor) {
            return res.status(400).json({ error: 'A vendor with this name already exists' });
          }
        }

        const vendor = await prisma.vendor.update({
          where: { id: req.params.id },
          data: req.body,
        });

        res.json({
          ...vendor,
          id: vendor.id.toString(),
        });
      } catch (error) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Vendor not found' });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Delete a vendor
  app.delete('/api/vendors/:id', async (req, res) => {
    try {
      await prisma.vendor.delete({
        where: { id: req.params.id },
      });
      
      res.status(204).send();
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Vendor not found' });
      }
      res.status(500).json({ error: error.message });
    }
  });
}