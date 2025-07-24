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
  // Get Google Drive settings
  app.get('/api/user/drive-settings', async (req, res) => {
    try {
      const settings = await prisma.driveSettings.findFirst();
      res.json({ hasCredentials: !!settings });
    } catch (error) {
      res.json({ hasCredentials: false });
    }
  });

  // Save Google Drive settings
  app.post('/api/user/drive-settings', async (req, res) => {
    try {
      const { serviceAccountKey } = req.body;
      
      if (!serviceAccountKey) {
        return res.status(400).json({ error: 'Service Account JSON is required' });
      }

      // Validate JSON
      try {
        JSON.parse(serviceAccountKey);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON format' });
      }

      await prisma.driveSettings.deleteMany();
      await prisma.driveSettings.create({
        data: { serviceAccountKey }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save credentials' });
    }
  });

  // Delete Google Drive settings
  app.delete('/api/user/drive-settings', async (req, res) => {
    try {
      await prisma.driveSettings.deleteMany();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete credentials' });
    }
  });

  // Backup to Google Drive
  app.post('/api/user/drive-backup', async (req, res) => {
    try {
      const settings = await prisma.driveSettings.findFirst();
      if (!settings) {
        return res.status(400).json({ error: 'Google Drive credentials not configured' });
      }

      const fs = await import('fs');
      const path = await import('path');
      const archiverModule = await import('archiver');
      const archiver = archiverModule.default;
      const { google } = await import('googleapis');
      
      const dbPath = path.join(process.cwd(), 'prisma', 'data', 'inventory.db');
      const zipPath = path.join(process.cwd(), 'backup.zip');
      
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.pipe(output);
      archive.file(dbPath, { name: 'inventory.db' });
      await archive.finalize();
      
      await new Promise((resolve) => output.on('close', resolve));
      
      const serviceAccount = JSON.parse(settings.serviceAccountKey);
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive'
        ]
      });
      
      const drive = google.drive({ version: 'v3', auth });
      
      // Find the shared folder
      const folders = await drive.files.list({
        q: "name='Inventory Backups' and mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id, name)'
      });
      
      if (!folders.data.files || folders.data.files.length === 0) {
        throw new Error('Folder "Inventory Backups" not found. Please create it and share with the service account.');
      }
      
      const backupFolder = folders.data.files[0];
      
      await drive.files.create({
        resource: { 
          name: `inventory-backup-${new Date().toISOString().split('T')[0]}.zip`,
          parents: [backupFolder.id]
        },
        media: { mimeType: 'application/zip', body: fs.createReadStream(zipPath) },
        fields: 'id'
      });
      
      fs.unlinkSync(zipPath);
      res.json({ success: true });
    } catch (error) {
      console.error('Drive backup error:', error);
      res.status(500).json({ error: 'Failed to backup to Google Drive' });
    }
  });

  // Save user email for backups
  app.post(
    '/api/user/settings',
    validateRequest({ body: userSettingsSchema }),
    async (req, res) => {
      try {
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