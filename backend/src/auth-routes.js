import { validateRequest } from './middleware.js';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(4, 'Password must be at least 4 characters'),
});

const updateEmailSchema = z.object({
  currentEmail: z.string().email('Invalid email address'),
  newEmail: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

export function setupAuthRoutes(app, prisma) {
  // Check if any user exists
  app.get('/api/auth/check', async (req, res) => {
    try {
      const userCount = await prisma.user.count();
      res.json({ hasUser: userCount > 0 });
    } catch (error) {
      res.json({ hasUser: false });
    }
  });

  // Signup (only if no users exist)
  app.post('/api/auth/signup', validateRequest({ body: signupSchema }), async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const userCount = await prisma.user.count();
      if (userCount > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      await prisma.user.create({
        data: { email, password }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: error.message || 'Failed to create user' });
    }
  });

  // Login
  app.post('/api/auth/login', validateRequest({ body: authSchema }), async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message || 'Login failed' });
    }
  });

  // Forgot Password - Send OTP
  app.post('/api/auth/forgot-password', validateRequest({ body: forgotPasswordSchema }), async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({ error: 'No user found with this email' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { id: user.id },
        data: { resetOtp: otp, otpExpiry }
      });

      console.log(`OTP for ${email}: ${otp}`);

      // Send OTP via email
      try {
        const emailService = (await import('./email-service.js')).default;
        await emailService.sendOTP(email, otp);
        res.json({ success: true, message: 'OTP sent to your email' });
      } catch (emailError) {
        console.error('Email service error:', emailError.message);
        res.json({ success: true, message: `Email service unavailable. Your OTP is: ${otp}` });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: error.message || 'Failed to send OTP' });
    }
  });

  // Reset Password with OTP
  app.post('/api/auth/reset-password', validateRequest({ body: resetPasswordSchema }), async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.resetOtp || user.resetOtp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      if (!user.otpExpiry || new Date() > user.otpExpiry) {
        return res.status(400).json({ error: 'OTP has expired' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { 
          password: newPassword,
          resetOtp: null,
          otpExpiry: null
        }
      });

      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // Update Email
  app.post('/api/auth/update-email', validateRequest({ body: updateEmailSchema }), async (req, res) => {
    try {
      const { currentEmail, newEmail, password } = req.body;
      
      const user = await prisma.user.findUnique({
        where: { email: currentEmail }
      });

      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: newEmail }
      });

      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail }
      });

      res.json({ success: true, message: 'Email updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update email' });
    }
  });
}