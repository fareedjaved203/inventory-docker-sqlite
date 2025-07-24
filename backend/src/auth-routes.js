import { validateRequest } from './middleware.js';
import { z } from 'zod';

const authSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  email: z.string().email('Invalid email address'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(4, 'Password must be at least 4 characters'),
});

const updateUsernameSchema = z.object({
  currentUsername: z.string().min(3, 'Username must be at least 3 characters'),
  newUsername: z.string().min(3, 'Username must be at least 3 characters'),
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
      const { username, password, email } = req.body;
      
      const userCount = await prisma.user.count();
      if (userCount > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      await prisma.user.create({
        data: { username, password, email }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Login
  app.post('/api/auth/login', validateRequest({ body: authSchema }), async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await prisma.user.findUnique({
        where: { username }
      });

      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Forgot Password - Send OTP
  app.post('/api/auth/forgot-password', validateRequest({ body: forgotPasswordSchema }), async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username: email } // Allow username as input too
          ]
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'No user found with this email/username' });
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
      
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username: email } // Allow username as input too
          ]
        }
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

  // Update Username
  app.post('/api/auth/update-username', validateRequest({ body: updateUsernameSchema }), async (req, res) => {
    try {
      const { currentUsername, newUsername, password } = req.body;
      
      const user = await prisma.user.findUnique({
        where: { username: currentUsername }
      });

      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { username: newUsername }
      });

      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { username: newUsername }
      });

      res.json({ success: true, message: 'Username updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update username' });
    }
  });
}