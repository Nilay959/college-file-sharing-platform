const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const File = require('../models/File');
const { requireAuth } = require('../middleware/auth');
const { upload, uploadToR2, getPresignedUrl } = require('../services/storageService');

const hasSpaceAccess = (userSpaces, spaceId) => (userSpaces || []).includes(spaceId);

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

router.get('/my/uploads', requireAuth, async (req, res) => {
  try {
    const files = await File.find({ uploaderId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('subjectId', 'name shortName');
    const formattedFiles = files.map(f => ({
      _id: f._id,
      name: f.originalName,
      subject: f.subjectId,
      space: f.spaceId,
      uploader: f.uploaderName,
      uploadedAt: f.createdAt,
      size: f.size,
      type: f.mimeType,
      storageKey: f.storageKey
    }));
    console.log("FORMATTING CALLED"); res.json(formattedFiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:spaceId', requireAuth, async (req, res) => {
  const { spaceId } = req.params;
  const { subjectId, search, page = 1, limit = 20 } = req.query;

  if (!hasSpaceAccess(req.user.spaces, spaceId)) {
    return res.status(403).json({ message: 'Forbidden: No access to this space' });
  }

  const query = { spaceId };
  if (subjectId && subjectId !== 'all') query.subjectId = subjectId;
  if (search) query.originalName = { $regex: search, $options: 'i' };

  try {
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('uploaderId', 'name email');
    const formattedFiles = files.map(f => ({
      _id: f._id,
      name: f.originalName,
      subject: f.subjectId,
      space: f.spaceId,
      uploader: f.uploaderName,
      uploadedAt: f.createdAt,
      size: f.size,
      type: f.mimeType,
      storageKey: f.storageKey
    }));
    console.log("FORMATTING CALLED"); res.json(formattedFiles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching files', error: error.message });
  }
});

router.post('/:spaceId/:subjectId', requireAuth, upload.single('file'), async (req, res) => {
  const { spaceId, subjectId } = req.params;

  if (!hasSpaceAccess(req.user.spaces, spaceId)) {
    return res.status(403).json({ message: 'Forbidden: No access to this space' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const uniqueFilename = `${spaceId}/${subjectId}/${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname}`;
    
    // Upload to Cloudflare R2
    const storageKey = await uploadToR2(req.file.buffer, uniqueFilename, req.file.mimetype);

    const newFile = new File({
      originalName: req.file.originalname,
      storageKey: storageKey,
      spaceId,
      subjectId,
      uploaderName: req.user.name,
      uploaderId: req.user.id,
      size: formatSize(req.file.size),
      mimeType: req.file.mimetype.split('/')[1] ? req.file.mimetype.split('/')[1].toUpperCase() : 'UNKNOWN'
    });

    await newFile.save();

    res.status(201).json({
      _id: newFile._id,
      name: newFile.originalName,
      subject: newFile.subjectId,
      space: newFile.spaceId,
      uploader: newFile.uploaderName,
      uploadedAt: newFile.createdAt,
      size: newFile.size,
      type: newFile.mimeType
    });
  } catch (error) {
    res.status(500).json({ message: 'Error saving file', error: error.message });
  }
});

router.get('/:fileId/download', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (!hasSpaceAccess(req.user.spaces, file.spaceId)) return res.status(403).json({ message: 'Forbidden' });

    // Try to get Presigned URL from R2
    try {
      const presignedUrl = await getPresignedUrl(file.storageKey);
      return res.redirect(presignedUrl);
    } catch (r2Error) {
      console.error("R2 Error:", r2Error.message);
      
      // Fallback for older files stored in GridFS
      if (mongoose.connection.db) {
        try {
          const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
          const files = await gfsBucket.find({ filename: file.storageKey }).toArray();
          if (files && files.length > 0) {
            res.set('Content-Type', file.mimeType);
            res.set('Content-Disposition', `inline; filename="${file.originalName}"`);
            const downloadStream = gfsBucket.openDownloadStreamByName(file.storageKey);
            downloadStream.on('error', () => res.status(404).json({ message: 'File stream error' }));
            return downloadStream.pipe(res);
          }
        } catch (gfsError) {
          console.error("GFS Fallback error:", gfsError.message);
        }
      }
      
      return res.status(404).json({ message: 'File not found in R2 or GridFS' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error generating download link', error: error.message });
  }
});

module.exports = router;
