const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Otp = require('../models/Otp');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../config/security');
const { sendOtpEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_must_change_in_production_32chars!';

// Helper: Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || '',
      isVerified: user.isVerified,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Helper: Secure 6-digit OTP generator
const generateOtpCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Helper: Password strength validator (Requirement 16)
const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  // Must contain at least one lowercase, one uppercase, and one digit
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  return hasLower && hasUpper && hasDigit;
};

// ==============================================================
// 1. REGISTER USER WITH EMAIL VERIFICATION (Requirements 4, 6, 16)
// ==============================================================
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    // Form sanitization and validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Full name is required (minimum 2 characters)' });
    }

    if (!email || typeof email !== 'string' || !validator.isEmail(email.trim())) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    if (!validatePasswordStrength(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const sanitizedName = name.trim().slice(0, 60);

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ message: 'An account with this email already exists. Please sign in.' });
      }
      // If user registered earlier but didn't verify, update their details and re-send OTP
      const hashedPassword = await bcrypt.hash(password, 12);
      existingUser.name = sanitizedName;
      existingUser.password = hashedPassword;
      if (avatar) existingUser.avatar = String(avatar).trim();
      await existingUser.save();
    } else {
      // Hash password with 12 rounds (Requirement 16)
      const hashedPassword = await bcrypt.hash(password, 12);

      await User.create({
        name: sanitizedName,
        email: normalizedEmail,
        password: hashedPassword,
        avatar: avatar ? String(avatar).trim() : '',
        role: 'user', // Strict: User cannot elevate their own role
        isVerified: false,
      });
    }

    // Generate and send 6-digit verification code
    const otp = generateOtpCode();
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'registration' });
    await Otp.create({
      email: normalizedEmail,
      otp,
      purpose: 'registration',
    });

    await sendOtpEmail(normalizedEmail, otp);

    res.status(201).json({
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      email: normalizedEmail,
      requiresVerification: true,
      // For smooth local testing without SMTP configured, include dev code
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration. Please try again.' });
  }
});

// ==============================================================
// 2. VERIFY REGISTRATION OTP (Requirement 4)
// ==============================================================
router.post('/verify-registration', otpLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const enteredOtp = String(otp).trim();

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      otp: enteredOtp,
      purpose: 'registration',
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new code.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'User record not found. Please register again.' });
    }

    user.isVerified = true;
    user.lastLogin = new Date();
    await user.save();

    // Clean up OTP record
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'registration' });

    const token = generateToken(user);

    res.json({
      message: 'Account verified successfully!',
      token,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Verify registration error:', error);
    res.status(500).json({ message: 'Server error during verification. Please try again.' });
  }
});

// ==============================================================
// 3. RESEND OTP (Requirement 4 & 8)
// ==============================================================
router.post('/resend-otp', otpLimiter, async (req, res) => {
  try {
    const { email, purpose = 'registration' } = req.body;

    if (!email || !validator.isEmail(email.trim())) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const otp = generateOtpCode();
    await Otp.deleteMany({ email: normalizedEmail, purpose });
    await Otp.create({
      email: normalizedEmail,
      otp,
      purpose,
    });

    await sendOtpEmail(normalizedEmail, otp);

    res.json({
      message: `A new 6-digit verification code has been sent to ${normalizedEmail}.`,
      email: normalizedEmail,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend verification code' });
  }
});

// ==============================================================
// 4. USER SIGN IN (Requirement 4, 8, 16)
// ==============================================================
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Explicitly select password hash for verification (not exposed by default)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // Generic error message to prevent account enumeration
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'This account has been deactivated. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // If account has not completed email verification yet
    if (user.isVerified === false) {
      const otp = generateOtpCode();
      await Otp.deleteMany({ email: normalizedEmail, purpose: 'registration' });
      await Otp.create({
        email: normalizedEmail,
        otp,
        purpose: 'registration',
      });
      await sendOtpEmail(normalizedEmail, otp);

      return res.status(403).json({
        requiresVerification: true,
        email: user.email,
        message: 'Please verify your email address to sign in. A new verification code has been sent.',
        devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    res.json({
      message: 'Signed in successfully',
      token,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during sign in. Please try again.' });
  }
});

// ==============================================================
// 5. FORGOT PASSWORD (OTP Request)
// ==============================================================
router.post('/forgot-password', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // For security, always respond with a generic success message to prevent user enumeration
    if (user && user.isActive !== false) {
      const otp = generateOtpCode();
      await Otp.deleteMany({ email: normalizedEmail, purpose: 'password_reset' });
      await Otp.create({
        email: normalizedEmail,
        otp,
        purpose: 'password_reset',
      });
      await sendOtpEmail(normalizedEmail, otp);

      return res.json({
        message: `If an account exists for ${normalizedEmail}, a password reset code has been sent.`,
        email: normalizedEmail,
        devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      });
    }

    res.json({
      message: `If an account exists for ${normalizedEmail}, a password reset code has been sent.`,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

// ==============================================================
// 6. RESET PASSWORD WITH OTP
// ==============================================================
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required' });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        message: 'New password must be at least 8 characters long and contain an uppercase letter, lowercase letter, and number',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const enteredOtp = String(otp).trim();

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      otp: enteredOtp,
      purpose: 'password_reset',
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired password reset code' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.isVerified = true;
    await user.save();

    await Otp.deleteMany({ email: normalizedEmail, purpose: 'password_reset' });

    res.json({ message: 'Password has been reset successfully. You can now sign in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// ==============================================================
// 7. GET CURRENT AUTHENTICATED USER
// ==============================================================
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==============================================================
// 8. UPDATE USER PROFILE (Requirement 3, 5: users access own data only)
// ==============================================================
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, avatar, password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      user.name = name.trim().slice(0, 60);
    }

    if (avatar !== undefined) {
      user.avatar = String(avatar).trim();
    }

    if (password) {
      if (!validatePasswordStrength(password)) {
        return res.status(400).json({
          message: 'New password must be at least 8 characters long and contain uppercase, lowercase, and numbers',
        });
      }
      user.password = await bcrypt.hash(password, 12);
    }

    // Role, email, and id cannot be changed here (prevents privilege escalation)
    await user.save();

    const token = generateToken(user);

    res.json({
      message: 'Profile updated successfully',
      token,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
});

module.exports = router;
