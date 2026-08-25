const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Hierarchy = require('../models/Hierarchy');
const EmailDomain = require('../models/EmailDomain');

const JWT_SECRET = process.env.JWT_SECRET;

const getSpacesForUser = (user) => {
  return [user.division, user.batch].filter(Boolean);
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, rollNo, department, semester, division, batch } = req.body;
    
    // Domain validation using EmailDomain collection
    const domainPart = email.split('@')[1];
    const validDomain = await EmailDomain.findOne({ domain: domainPart, isActive: true });
    if (!validDomain) {
      return res.status(400).json({ message: 'This platform is restricted to students with a valid college email address.' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const batchNode = await Hierarchy.findOne({ type: 'batch', value: batch, isActive: true }).populate('parentId');
    if (!batchNode) return res.status(400).json({ message: 'Invalid or inactive batch selection' });
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name, email, password: hashedPassword, rollNo, department, semester, division, batch,
      role: 'student', // Force student role
      isEmailVerified: true // Instantly verified via domain check
    });
    await user.save();
    
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role, spaces: getSpacesForUser(user) }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, user: { name: user.name, email: user.email, role: user.role, spaces: getSpacesForUser(user) } });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact an administrator.' });
    }
    
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role, spaces: getSpacesForUser(user) }, JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ token, user: { name: user.name, email: user.email, role: user.role, spaces: getSpacesForUser(user), department: user.department, semester: user.semester } });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// For frontend to get current user details, specially needed for dynamic spaces/subjects
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
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
