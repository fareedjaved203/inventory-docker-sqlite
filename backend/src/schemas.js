import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  price: z.number().positive("Price must be positive").max(100000000, "Price cannot exceed Rs.10 Crores"),
  purchasePrice: z.number().positive("Price must be positive").max(100000000, "Price cannot exceed Rs.10 Crores").optional(),
  sku: z.string().optional(),
  quantity: z.number().int().min(0, "Quantity must be non-negative").max(1000000000, "Quantity cannot exceed 1 billion"),
  lowStockThreshold: z.number().int().min(0, "Low stock threshold must be non-negative").optional(),
});

export const productUpdateSchema = productSchema.partial();

export const saleItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive").max(100000000, "Price cannot exceed Rs.10 Crores"),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
  totalAmount: z.number().min(0, "Total amount cannot be negative").max(100000000, "Total amount cannot exceed Rs.10 Crores"),
  paidAmount: z.number().min(0, "Paid amount cannot be negative").max(100000000, "Paid amount cannot exceed Rs.10 Crores"),
  contactId: z.string().optional(),
  billNumber: z.string().optional(), // Optional because it will be auto-generated
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  discount: z.number().min(0)
});

export const bulkPurchaseItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  purchasePrice: z.number().positive("Purchase price must be positive").max(100000000, "Purchase price cannot exceed Rs.10 Crores"),
});

export const bulkPurchaseSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  items: z.array(bulkPurchaseItemSchema).min(1, "At least one item is required"),
  totalAmount: z.number().positive("Total amount must be positive").max(100000000, "Total amount cannot exceed Rs.10 Crores"),
  paidAmount: z.number().min(0, "Paid amount cannot be negative").max(100000000, "Paid amount cannot exceed Rs.10 Crores"),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
});

export const contactProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  quantity: z.number().int().min(0, "Quantity must be non-negative"),
  price: z.number().positive("Price must be positive"),
});

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export const contactUpdateSchema = contactSchema.partial();

export const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
  startDate: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, "Start date must be in DD/MM/YYYY format").optional(),
  endDate: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, "End date must be in DD/MM/YYYY format").optional(),
  vendorId: z.string().optional(),
});