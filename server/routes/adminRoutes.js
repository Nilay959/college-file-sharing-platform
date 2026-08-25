const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Hierarchy = require('../models/Hierarchy');
const Subject = require('../models/Subject');
const EmailDomain = require('../models/EmailDomain');
const File = require('../models/File');

router.use(requireAuth, requireAdmin);

// Dashboard Stats
router.get('/dashboard', async (req, res) => {
  try {
    const students = await User.countDocuments({ role: 'student' });
    const departments = await Hierarchy.countDocuments({ type: 'department', isActive: true });
    const subjects = await Subject.countDocuments({ isActive: true });
    const files = await File.countDocuments();
    const recentUploads = await File.find().sort({ createdAt: -1 }).limit(5).populate('uploaderId', 'name');
    res.json({ students, departments, subjects, files, recentUploads });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Hierarchy Management
router.post('/hierarchy', async (req, res) => {
  try {
    const item = await Hierarchy.create(req.body);
    res.status(201).json(item);
  } catch (error) { res.status(400).json({ error: error.message }); }
});
router.delete('/hierarchy/:id', async (req, res) => {
  try {
    await Hierarchy.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

router.put('/hierarchy/:id', async (req, res) => {
  try {
    const item = await Hierarchy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

// Subject Management
router.get('/subjects', async (req, res) => {
  try { res.json(await Subject.find()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/subjects', async (req, res) => {
  try { res.status(201).json(await Subject.create(req.body)); }
  catch (error) { res.status(400).json({ error: error.message }); }
});
router.put('/subjects/:id', async (req, res) => {
  try { res.json(await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (error) { res.status(400).json({ error: error.message }); }
});
router.delete('/subjects/:id', async (req, res) => {
  try { await Subject.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (error) { res.status(400).json({ error: error.message }); }
});

// User Management
router.get('/users', async (req, res) => {
  try { res.json(await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.put('/users/:id/status', async (req, res) => {
  try { res.json(await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true })); }
  catch (error) { res.status(400).json({ error: error.message }); }
});

// File Moderation
router.get('/files', async (req, res) => {
  try { res.json(await File.find().sort({ createdAt: -1 }).populate('uploaderId', 'name')); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.delete('/files/:id', async (req, res) => {
  try { await File.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (error) { res.status(400).json({ error: error.message }); }
});

// Email Domains
router.get('/domains', async (req, res) => {
  try { res.json(await EmailDomain.find()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.post('/domains', async (req, res) => {
  try { res.status(201).json(await EmailDomain.create(req.body)); }
  catch (error) { res.status(400).json({ error: error.message }); }
});
router.put('/domains/:id', async (req, res) => {
  try { res.json(await EmailDomain.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (error) { res.status(400).json({ error: error.message }); }
});
router.delete('/domains/:id', async (req, res) => {
  try { await EmailDomain.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (error) { res.status(400).json({ error: error.message }); }
});

module.exports = router;
