const express = require('express');
const router = express.Router();
const User = require('../models/User');
const EmailDomain = require('../models/EmailDomain');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { requireAuth } = require('../middleware/auth');
const { sendOtpEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET;

const getSpacesForUser = (user) => {
  return [user.division, user.batch].filter(Boolean);
};

// 1. Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate domain
    const domain = email.split('@')[1];
    const allowedDomain = await EmailDomain.findOne({ domain });
    if (!allowedDomain) {
      return res.status(403).json({ message: 'Email domain not allowed. Use your college email.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTPs for this email to prevent spam conflicts
    await Otp.deleteMany({ email });

    // Save to DB (expires in 10 mins automatically via TTL index)
    await Otp.create({ email, otp: otpCode });

    // Send Email
    const emailSent = await sendOtpEmail(email, otpCode);
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again later.' });
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error generating OTP' });
  }
});

// 2. Register User (Verifies OTP)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, rollNo, department, semester, division, batch, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    // Verify OTP
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const domain = email.split('@')[1];
    const allowedDomain = await EmailDomain.findOne({ domain });
    if (!allowedDomain) {
      return res.status(403).json({ message: 'Email domain not allowed' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name, email, password: hashedPassword, rollNo, department, semester, division, batch,
      role: 'student',
      isEmailVerified: true
    });

    // Clean up OTP so it can't be reused
    await Otp.deleteOne({ _id: validOtp._id });

    if (!JWT_SECRET) throw new Error("JWT_SECRET missing");
    
    const token = jwt.sign(
      { id: user._id, role: user.role, spaces: getSpacesForUser(user), name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, role: user.role, spaces: getSpacesForUser(user), email: user.email }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    let isMatch = false;
    if (user) {
      if (user.password === password) {
        isMatch = true; // Legacy plain text accounts during test phase
      } else {
        try {
          isMatch = await bcrypt.compare(password, user.password);
        } catch(e) {}
      }
    }

    if (!user || !isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is disabled. Contact admin.' });
    }

    if (!JWT_SECRET) throw new Error("JWT_SECRET missing");

    const token = jwt.sign(
      { id: user._id, role: user.role, spaces: getSpacesForUser(user), name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role, spaces: getSpacesForUser(user), department: user.department, semester: user.semester, email: user.email }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get Me Route
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'User inactive' });
    res.json({ name: user.name, email: user.email, role: user.role, spaces: getSpacesForUser(user), department: user.department, semester: user.semester });
  } catch(e) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
