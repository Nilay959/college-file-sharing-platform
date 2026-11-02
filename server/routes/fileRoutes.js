const express = require('express');
const router = express.Router();
const File = require('../models/File');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');
const { upload, uploadToR2, getPresignedUrl, deleteFromR2 } = require('../services/storageService');

// Helper to determine mimeType category for filtering
const getMimeCategoryFilter = (type) => {
  if (!type || type === 'all') return null;
  const lower = type.toLowerCase();
  if (lower === 'pdf') {
    return { mimeType: { $regex: 'pdf', $options: 'i' } };
  }
  if (lower === 'doc' || lower === 'document') {
    return {
      $or: [
        { mimeType: { $regex: 'word|officedocument.wordprocessingml', $options: 'i' } },
        { originalName: { $regex: '\\.(docx?|txt|rtf|odt)$', $options: 'i' } },
      ],
    };
  }
  if (lower === 'sheet' || lower === 'spreadsheet') {
    return {
      $or: [
        { mimeType: { $regex: 'excel|spreadsheet|officedocument.spreadsheetml', $options: 'i' } },
        { originalName: { $regex: '\\.(xlsx?|csv|ods)$', $options: 'i' } },
      ],
    };
  }
  if (lower === 'presentation' || lower === 'ppt') {
    return {
      $or: [
        { mimeType: { $regex: 'presentation|powerpoint|officedocument.presentationml', $options: 'i' } },
        { originalName: { $regex: '\\.(pptx?|odp)$', $options: 'i' } },
      ],
    };
  }
  if (lower === 'image') {
    return { mimeType: { $regex: '^image/', $options: 'i' } };
  }
  if (lower === 'archive' || lower === 'zip') {
    return {
      $or: [
        { mimeType: { $regex: 'zip|compressed|tar|rar|7z', $options: 'i' } },
        { originalName: { $regex: '\\.(zip|rar|7z|tar|gz)$', $options: 'i' } },
      ],
    };
  }
  return null;
};

// Helper to format file size in human readable string
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 1. Upload file to a specific group
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) {
      return res.status(400).json({ message: 'Target group ID is required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided for upload' });
    }

    // Security Check: Caller must be a member of the group
    const membership = await GroupMember.findOne({
      userId: req.user.id,
      groupId,
    });

    if (!membership) {
      return res.status(403).json({ message: 'You must be a member of this group to upload files' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Generate unique storage key for Cloudflare R2 / S3
    const timestamp = Date.now();
    const cleanFileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `groups/${groupId}/${timestamp}-${cleanFileName}`;

    // Upload to Cloudflare R2
    await uploadToR2(req.file.buffer, storageKey, req.file.mimetype);

    // Save File document
    const file = await File.create({
      originalName: req.file.originalname,
      storageKey,
      fileSize: req.file.size,
      mimeType: req.file.mimetype || 'application/octet-stream',
      uploadedBy: req.user.id,
      groupId,
      size: formatFileSize(req.file.size), // backward-compatible string format
    });

    // Record Activity
    await Activity.create({
      userId: req.user.id,
      groupId,
      fileId: file._id,
      action: 'uploaded_file',
      details: `Uploaded "${file.originalName}" to ${group.name}`,
    });

    const populated = await File.findById(file._id)
      .populate('uploadedBy', 'name email avatar')
      .populate('groupId', 'name inviteCode')
      .lean();

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        ...populated,
        id: populated._id,
        size: formatFileSize(populated.fileSize),
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: error.message || 'Failed to upload file' });
  }
});

// 2. Get files in a specific group
router.get('/group/:groupId', requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { q, type, sort, uploaderId } = req.query;

    // Security Check: Caller must be a member of this group
    const membership = await GroupMember.findOne({
      userId: req.user.id,
      groupId,
    });

    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const query = { groupId };

    if (q && q.trim()) {
      query.originalName = { $regex: q.trim(), $options: 'i' };
    }

    if (uploaderId) {
      query.uploadedBy = uploaderId;
    }

    const typeFilter = getMimeCategoryFilter(type);
    if (typeFilter) {
      Object.assign(query, typeFilter);
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'name') sortOption = { originalName: 1 };
    if (sort === 'size') sortOption = { fileSize: -1 };

    const files = await File.find(query)
      .populate('uploadedBy', 'name email avatar')
      .populate('groupId', 'name inviteCode')
      .sort(sortOption)
      .lean();

    const formatted = files.map((f) => ({
      ...f,
      id: f._id,
      size: formatFileSize(f.fileSize),
      canDelete: f.uploadedBy?._id?.toString() === req.user.id || membership.role === 'admin',
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Fetch group files error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch files' });
  }
});

// 3. Get all accessible files across ALL groups user is part of
router.get('/', requireAuth, async (req, res) => {
  try {
    const { q, type, sort, groupId } = req.query;

    // Get all groups user belongs to
    const memberships = await GroupMember.find({ userId: req.user.id });
    const userGroupIds = memberships.map((m) => m.groupId);

    if (userGroupIds.length === 0) {
      return res.json([]);
    }

    let targetGroupIds = userGroupIds;
    if (groupId) {
      // Validate requested groupId is among user's groups
      if (!userGroupIds.some((id) => id.toString() === groupId)) {
        return res.status(403).json({ message: 'You are not a member of the requested group' });
      }
      targetGroupIds = [groupId];
    }

    const query = { groupId: { $in: targetGroupIds } };

    if (q && q.trim()) {
      query.originalName = { $regex: q.trim(), $options: 'i' };
    }

    const typeFilter = getMimeCategoryFilter(type);
    if (typeFilter) {
      Object.assign(query, typeFilter);
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'name') sortOption = { originalName: 1 };
    if (sort === 'size') sortOption = { fileSize: -1 };

    const files = await File.find(query)
      .populate('uploadedBy', 'name email avatar')
      .populate('groupId', 'name inviteCode')
      .sort(sortOption)
      .lean();

    const formatted = files.map((f) => {
      const groupMembership = memberships.find(
        (m) => m.groupId.toString() === f.groupId?._id?.toString()
      );
      const isUploader = f.uploadedBy?._id?.toString() === req.user.id;
      const isAdmin = groupMembership?.role === 'admin';

      return {
        ...f,
        id: f._id,
        size: formatFileSize(f.fileSize),
        canDelete: isUploader || isAdmin,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Fetch all files error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch files' });
  }
});

// 4. My Uploads: Files uploaded by the logged-in user across their groups
router.get('/my-uploads', requireAuth, async (req, res) => {
  try {
    const { q, type, sort, groupId } = req.query;

    const memberships = await GroupMember.find({ userId: req.user.id });
    const userGroupIds = memberships.map((m) => m.groupId);

    if (userGroupIds.length === 0) {
      return res.json([]);
    }

    let targetGroupIds = userGroupIds;
    if (groupId) {
      targetGroupIds = [groupId];
    }

    const query = {
      uploadedBy: req.user.id,
      groupId: { $in: targetGroupIds },
    };

    if (q && q.trim()) {
      query.originalName = { $regex: q.trim(), $options: 'i' };
    }

    const typeFilter = getMimeCategoryFilter(type);
    if (typeFilter) {
      Object.assign(query, typeFilter);
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'name') sortOption = { originalName: 1 };
    if (sort === 'size') sortOption = { fileSize: -1 };

    const files = await File.find(query)
      .populate('uploadedBy', 'name email avatar')
      .populate('groupId', 'name inviteCode')
      .sort(sortOption)
      .lean();

    const formatted = files.map((f) => ({
      ...f,
      id: f._id,
      size: formatFileSize(f.fileSize),
      canDelete: true, // User is the uploader
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Fetch my-uploads error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch my uploads' });
  }
});

// 5. Shared With Me: Files uploaded by OTHER members in common groups
router.get('/shared-with-me', requireAuth, async (req, res) => {
  try {
    const { q, type, sort, groupId } = req.query;

    const memberships = await GroupMember.find({ userId: req.user.id });
    const userGroupIds = memberships.map((m) => m.groupId);

    if (userGroupIds.length === 0) {
      return res.json([]);
    }

    let targetGroupIds = userGroupIds;
    if (groupId) {
      targetGroupIds = [groupId];
    }

    const query = {
      uploadedBy: { $ne: req.user.id },
      groupId: { $in: targetGroupIds },
    };

    if (q && q.trim()) {
      query.originalName = { $regex: q.trim(), $options: 'i' };
    }

    const typeFilter = getMimeCategoryFilter(type);
    if (typeFilter) {
      Object.assign(query, typeFilter);
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'name') sortOption = { originalName: 1 };
    if (sort === 'size') sortOption = { fileSize: -1 };

    const files = await File.find(query)
      .populate('uploadedBy', 'name email avatar')
      .populate('groupId', 'name inviteCode')
      .sort(sortOption)
      .lean();

    const formatted = files.map((f) => {
      const groupMembership = memberships.find(
        (m) => m.groupId.toString() === f.groupId?._id?.toString()
      );
      const isAdmin = groupMembership?.role === 'admin';

      return {
        ...f,
        id: f._id,
        size: formatFileSize(f.fileSize),
        canDelete: isAdmin, // Group admin can delete any file
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Fetch shared-with-me error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch shared files' });
  }
});

// 6. Download file (Presigned R2 URL)
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });

    // Security Check: Caller must belong to the file's group
    const membership = await GroupMember.findOne({
      userId: req.user.id,
      groupId: file.groupId,
    });

    if (!membership) {
      return res.status(403).json({ message: 'You do not have permission to download this file' });
    }

    const downloadUrl = await getPresignedUrl(file.storageKey);

    if (req.query.redirect === 'true') {
      return res.redirect(downloadUrl);
    }

    res.json({
      downloadUrl,
      fileName: file.originalName,
      mimeType: file.mimeType,
      size: formatFileSize(file.fileSize),
    });
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate download URL' });
  }
});

// 7. Preview file
router.get('/:id/preview', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
      .populate('uploadedBy', 'name email avatar')
      .populate('groupId', 'name inviteCode');

    if (!file) return res.status(404).json({ message: 'File not found' });

    // Security Check: Caller must belong to the file's group
    const membership = await GroupMember.findOne({
      userId: req.user.id,
      groupId: file.groupId._id,
    });

    if (!membership) {
      return res.status(403).json({ message: 'You do not have permission to preview this file' });
    }

    const previewUrl = await getPresignedUrl(file.storageKey);

    res.json({
      previewUrl,
      file: {
        ...file.toObject(),
        id: file._id,
        size: formatFileSize(file.fileSize),
      },
    });
  } catch (error) {
    console.error('Preview file error:', error);
    res.status(500).json({ message: error.message || 'Failed to preview file' });
  }
});

// 8. Delete file (Uploader OR Group Admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });

    // Check membership
    const membership = await GroupMember.findOne({
      userId: req.user.id,
      groupId: file.groupId,
    });

    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const isUploader = file.uploadedBy.toString() === req.user.id;
    const isGroupAdmin = membership.role === 'admin';

    if (!isUploader && !isGroupAdmin) {
      return res.status(403).json({
        message: 'Permission denied: Only the file uploader or group admin can delete this file',
      });
    }

    // Delete from R2
    if (file.storageKey) {
      try {
        await deleteFromR2(file.storageKey);
      } catch (err) {
        console.warn('R2 deletion warning:', err.message);
      }
    }

    // Delete DB record
    await File.deleteOne({ _id: file._id });

    // Record activity
    await Activity.create({
      userId: req.user.id,
      groupId: file.groupId,
      action: 'deleted_file',
      details: `Deleted "${file.originalName}"`,
    });

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: error.message || 'Failed to delete file' });
  }
});

module.exports = router;
