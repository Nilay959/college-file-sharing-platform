const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const File = require('../models/File');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../services/storageService');

let gfsBucket;
mongoose.connection.once('open', () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
});

const hasSpaceAccess = (userSpaces, spaceId) => userSpaces.includes(spaceId);

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

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
      .limit(parseInt(limit));
    
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

    res.status(200).json(formattedFiles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching files', error });
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
    if (!gfsBucket) throw new Error("GridFS not initialized");

    const uniqueFilename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + req.file.originalname;
    
    const uploadStream = gfsBucket.openUploadStream(uniqueFilename, {
      contentType: req.file.mimetype
    });

    uploadStream.end(req.file.buffer);

    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    const newFile = new File({
      originalName: req.file.originalname,
      storageKey: uniqueFilename, // store GridFS filename
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
      type: newFile.mimeType,
      storageKey: newFile.storageKey
    });
  } catch (error) {
    res.status(500).json({ message: 'Error saving file to GridFS', error: error.message });
  }
});

router.get('/:fileId/download', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (!hasSpaceAccess(req.user.spaces, file.spaceId)) return res.status(403).json({ message: 'Forbidden' });

    if (!gfsBucket) throw new Error("GridFS not initialized");

    const files = await gfsBucket.find({ filename: file.storageKey }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'File data not found in GridFS' });
    }

    res.set('Content-Type', file.mimeType);
    res.set('Content-Disposition', `inline; filename="${file.originalName}"`);
    
    const downloadStream = gfsBucket.openDownloadStreamByName(file.storageKey);
    downloadStream.on('error', () => res.status(404).json({ message: 'File stream error' }));
    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading file', error: error.message });
  }
});

module.exports = router;
