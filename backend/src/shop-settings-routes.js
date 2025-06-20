import { validateRequest } from './middleware.js';
import { z } from 'zod';

const shopSettingsSchema = z.object({
  email: z.string().email("Valid email is required"),
  shopName: z.string().min(1, "Shop name is required"),
  shopDescription: z.string().optional(),
  shopDescription2: z.string().optional(),
  userName1: z.string().min(1, "At least one user name is required"),
  userPhone1: z.string().min(1, "Phone number for user 1 is required"),
  userName2: z.string().optional(),
  userPhone2: z.string().optional(),
  userName3: z.string().optional(),
  userPhone3: z.string().optional(),
  brand1: z.string().optional(),
  brand1Registered: z.boolean().optional(),
  brand2: z.string().optional(),
  brand2Registered: z.boolean().optional(),
  brand3: z.string().optional(),
  brand3Registered: z.boolean().optional(),
});

export function setupShopSettingsRoutes(app, prisma) {
  // Get shop settings
  app.get('/api/shop-settings', async (req, res) => {
    try {
      const settings = await prisma.shopSettings.findFirst();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create or update shop settings
  app.post('/api/shop-settings', validateRequest({ body: shopSettingsSchema }), async (req, res) => {
    try {
      const existingSettings = await prisma.shopSettings.findFirst();
      
      let settings;
      if (existingSettings) {
        settings = await prisma.shopSettings.update({
          where: { id: existingSettings.id },
          data: req.body,
        });
      } else {
        settings = await prisma.shopSettings.create({
          data: req.body,
        });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}