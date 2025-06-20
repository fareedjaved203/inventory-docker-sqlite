import { validateRequest } from './middleware.js';
import { z } from 'zod';
import emailService from './email-service.js';
import nodemailer from 'nodemailer';

// Schema for user settings
const userSettingsSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Schema for email backup request
const emailBackupSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export function setupUserRoutes(app, prisma) {
  // Save user email for backups
  app.post(
    '/api/user/settings',
    validateRequest({ body: userSettingsSchema }),
    async (req, res) => {
      try {
        // In a real app, you might want to store this in the database
        // For now, we'll just return success
        res.status(200).json({ 
          success: true,
          message: 'User settings saved successfully'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Send database backup to user's email
  app.post(
    '/api/user/backup',
    validateRequest({ body: emailBackupSchema }),
    async (req, res) => {
      try {
        const { email } = req.body;
        
        // Send the database backup
        const result = await emailService.sendDatabaseBackup(email);
        
        // For test accounts, include the preview URL
        const response = {
          success: true,
          message: 'Database backup sent successfully',
          messageId: result.messageId
        };
        
        // Add preview URL if using Ethereal
        const previewURL = nodemailer.getTestMessageUrl(result);
        if (previewURL) {
          response.previewUrl = previewURL;
        }
        
        res.status(200).json(response);
      } catch (error) {
        console.error('Error sending database backup:', error);
        res.status(500).json({ 
          error: error.message || 'Failed to send database backup'
        });
      }
    }
  );

  // Test email configuration
  app.post(
    '/api/user/test-email',
    validateRequest({ body: emailBackupSchema }),
    async (req, res) => {
      try {
        const { email } = req.body;
        
        // Test the email configuration
        const result = await emailService.testEmailConfig(email);
        
        // For test accounts, include the preview URL
        const response = {
          success: true,
          message: 'Test email sent successfully',
          messageId: result.messageId
        };
        
        // Add preview URL if using Ethereal
        const previewURL = nodemailer.getTestMessageUrl(result);
        if (previewURL) {
          response.previewUrl = previewURL;
        }
        
        res.status(200).json(response);
      } catch (error) {
        console.error('Error testing email configuration:', error);
        res.status(500).json({ 
          error: error.message || 'Failed to send test email'
        });
      }
    }
  );
}