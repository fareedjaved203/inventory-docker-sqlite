import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { setupVendorRoutes } from './vendor-routes';

jest.mock('@prisma/client');

describe('Vendor Routes', () => {
  let app;
  let prisma;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    prisma = new PrismaClient();
    setupVendorRoutes(app, prisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/vendors', () => {
    it('should return paginated vendors', async () => {
      const mockVendors = [
        { id: '1', name: 'Vendor 1', address: '123 St', phoneNumber: '1234567890' },
        { id: '2', name: 'Vendor 2', address: '456 St', phoneNumber: '0987654321' },
      ];

      prisma.vendor.findMany.mockResolvedValue(mockVendors);
      prisma.vendor.count.mockResolvedValue(2);

      const response = await request(app).get('/api/vendors');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should handle search parameter', async () => {
      const mockVendors = [
        { id: '1', name: 'Vendor 1', address: '123 St', phoneNumber: '1234567890' },
      ];

      prisma.vendor.findMany.mockResolvedValue(mockVendors);
      prisma.vendor.count.mockResolvedValue(1);

      const response = await request(app).get('/api/vendors?search=Vendor 1');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].name).toBe('Vendor 1');
    });
  });

  describe('POST /api/vendors', () => {
    it('should create a new vendor', async () => {
      const mockVendor = {
        id: '1',
        name: 'New Vendor',
        address: '789 St',
        phoneNumber: '5555555555',
      };

      prisma.vendor.create.mockResolvedValue(mockVendor);

      const response = await request(app)
        .post('/api/vendors')
        .send({
          name: 'New Vendor',
          address: '789 St',
          phoneNumber: '5555555555',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockVendor);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/vendors')
        .send({
          name: 'New Vendor',
          // missing address and phoneNumber
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/vendors/:id', () => {
    it('should update a vendor', async () => {
      const mockVendor = {
        id: '1',
        name: 'Updated Vendor',
        address: '321 St',
        phoneNumber: '9999999999',
      };

      prisma.vendor.update.mockResolvedValue(mockVendor);

      const response = await request(app)
        .put('/api/vendors/1')
        .send({
          name: 'Updated Vendor',
          address: '321 St',
          phoneNumber: '9999999999',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockVendor);
    });

    it('should return 404 for non-existent vendor', async () => {
      prisma.vendor.update.mockRejectedValue({ code: 'P2025' });

      const response = await request(app)
        .put('/api/vendors/999')
        .send({
          name: 'Updated Vendor',
          address: '321 St',
          phoneNumber: '9999999999',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/vendors/:id', () => {
    it('should return a vendor by id', async () => {
      const mockVendor = {
        id: '1',
        name: 'Vendor 1',
        address: '123 St',
        phoneNumber: '1234567890',
      };

      prisma.vendor.findUnique.mockResolvedValue(mockVendor);

      const response = await request(app).get('/api/vendors/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockVendor);
    });

    it('should return 404 for non-existent vendor', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/vendors/999');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/vendors/:id', () => {
    it('should delete a vendor', async () => {
      prisma.vendor.delete.mockResolvedValue({});

      const response = await request(app).delete('/api/vendors/1');

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent vendor', async () => {
      prisma.vendor.delete.mockRejectedValue({ code: 'P2025' });

      const response = await request(app).delete('/api/vendors/999');

      expect(response.status).toBe(404);
    });
  });
});