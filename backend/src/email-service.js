import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Email service for sending database backups and other notifications
 */
class EmailService {
  constructor() {
    // Path to the SQLite database file - extract from DATABASE_URL
    let dbPath = process.env.DB_PATH || './inventory.db';
    
    // If DATABASE_URL is set, extract the path from it
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
      dbPath = process.env.DATABASE_URL.replace('file:', '');
    }
    
    // Make it relative to the backend directory
    this.dbPath = path.resolve(dbPath);
    this.transporter = null;
  }

  /**
   * Initialize the email transporter with test account if needed
   */
  async initTransporter() {
    if (this.transporter) return this.transporter;

    // Debug logging
    console.log('SMTP_USER:', !!process.env.SMTP_USER);
    console.log('SMTP_PASS:', !!process.env.SMTP_PASS);
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    
    // If SMTP credentials are provided, use them
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log('Using real SMTP service - emails will be sent to actual recipients');
      console.log('Creating Gmail transporter with:', {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true'
      });
      
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false
        }
      });
      
      // Verify connection configuration
      try {
        await this.transporter.verify();
        console.log('SMTP connection verified successfully - using real email service');
      } catch (error) {
        console.error('SMTP connection verification failed:', error.message);
        console.log('Falling back to test email service');
        this.transporter = null; // Reset so it falls through to test service
      }
    } else {
      // Create a test account for development
      console.log('No SMTP credentials found - using test email service');
      console.log('Emails will only be visible via preview URLs, not sent to real recipients');
      const testAccount = await nodemailer.createTestAccount();
      console.log('Test email account created:', testAccount.user);
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }
    
    return this.transporter;
  }

  /**
   * Send database backup to the specified email
   * @param {string} email - Recipient email address
   * @returns {Promise<Object>} - Email sending result
   */
  async sendDatabaseBackup(email) {
    if (!email) {
      throw new Error('Email address is required');
    }

    // Check if database file exists
    if (!fs.existsSync(this.dbPath)) {
      throw new Error(`Database file not found at ${this.dbPath}`);
    }

    console.log(`Sending database backup from: ${this.dbPath}`);

    // Initialize transporter if needed
    await this.initTransporter();

    // Create a readable stream of the database file
    const dbStream = fs.createReadStream(this.dbPath);
    
    // Get current date for the filename
    const date = new Date().toISOString().split('T')[0];
    
    // Send email with attachment
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'fareedjaved203@gmail.com',
        to: email,
        subject: `Inventory Database Backup - ${date}`,
        text: 'Please find attached your inventory database backup.',
        html: `
          <h2>Inventory Database Backup</h2>
          <p>Please find attached your inventory database backup generated on ${new Date().toLocaleDateString()}.</p>
          <p>This file contains all your inventory data and can be restored if needed.</p>
          <p><strong>Note:</strong> Keep this file secure as it contains all your business data.</p>
        `,
        attachments: [
          {
            filename: `inventory_backup_${date}.db`,
            content: dbStream
          }
        ]
      });

      console.log('Email sent successfully:', info.messageId);

      // For test accounts, log the preview URL
      const previewURL = nodemailer.getTestMessageUrl(info);
      if (previewURL) {
        console.log('Preview URL: %s', previewURL);
      }

      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Test the email configuration
   * @param {string} email - Test recipient email
   * @returns {Promise<Object>} - Test result
   */
  async testEmailConfig(email) {
    // Initialize transporter if needed
    await this.initTransporter();
    
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Inventory System" <inventory@example.com>',
        to: email,
        subject: 'Email Configuration Test',
        text: 'If you receive this email, your email configuration is working correctly.',
        html: '<h2>Email Configuration Test</h2><p>If you receive this email, your email configuration is working correctly.</p>'
      });

      console.log('Test email sent successfully:', info.messageId);

      // For test accounts, log the preview URL
      const previewURL = nodemailer.getTestMessageUrl(info);
      if (previewURL) {
        console.log('Preview URL: %s', previewURL);
      }

      return info;
    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }
}

export default new EmailService();