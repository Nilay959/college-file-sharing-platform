const express = require('express');
const router = express.Router();
const File = require('../models/File');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../services/storageService');
const path = require('path');

// Helper to check if user has access to a space
const hasSpaceAccess = (userSpaces, spaceId) => {
  return userSpaces.includes(spaceId);
};

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get files for a space
router.get('/:spaceId', requireAuth, async (req, res) => {
  const { spaceId } = req.params;
  const { subjectId, search, page = 1, limit = 20 } = req.query;

  if (!hasSpaceAccess(req.user.spaces, spaceId)) {
    return res.status(403).json({ message: 'Forbidden: No access to this space' });
  }

  const query = { spaceId };
  if (subjectId && subjectId !== 'all') {
    query.subjectId = subjectId;
  }
  if (search) {
    query.originalName = { $regex: search, $options: 'i' };
  }

  try {
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Map to frontend expected format
    const formattedFiles = files.map(f => ({
      id: f._id,
      name: f.originalName,
      subject: f.subjectId,
      space: f.spaceId,
      uploader: f.uploaderName,
      uploadedAt: f.createdAt,
      size: f.size,
      type: f.mimeType,
      storageKey: f.storageKey
    }));

    res.status(200).json(formattedFiles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching files', error });
  }
});

// Upload a file to a space and subject
router.post('/:spaceId/:subjectId', requireAuth, upload.single('file'), async (req, res) => {
  const { spaceId, subjectId } = req.params;

  if (!hasSpaceAccess(req.user.spaces, spaceId)) {
    return res.status(403).json({ message: 'Forbidden: No access to this space' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const newFile = new File({
      originalName: req.file.originalname,
      storageKey: req.file.filename,
      spaceId,
      subjectId,
      uploaderName: req.user.name,
      uploaderId: req.user.id,
      size: formatSize(req.file.size),
      mimeType: req.file.mimetype.split('/')[1] ? req.file.mimetype.split('/')[1].toUpperCase() : 'UNKNOWN'
    });

    await newFile.save();

    res.status(201).json({
      id: newFile._id,
      name: newFile.originalName,
      subject: newFile.subjectId,
      space: newFile.spaceId,
      uploader: newFile.uploaderName,
      uploadedAt: newFile.createdAt,
      size: newFile.size,
      type: newFile.mimeType,
      storageKey: newFile.storageKey
    });
  } catch (error) {
    res.status(500).json({ message: 'Error saving file', error });
  }
});

// Download/preview file
router.get('/:fileId/download', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    if (!hasSpaceAccess(req.user.spaces, file.spaceId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const filePath = path.join(__dirname, '../uploads', file.storageKey);
    res.download(filePath, file.originalName);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading file' });
  }
});

module.exports = router;
