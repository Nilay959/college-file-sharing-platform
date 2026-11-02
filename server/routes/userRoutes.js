const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const File = require('../models/File');
const { requireAuth } = require('../middleware/auth');

// Helper to format file size
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// GET /api/users/:id - User profile and their files within common groups only
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const targetUser = await User.findById(targetUserId).select('name email avatar createdAt').lean();

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find groups of caller
    const callerMemberships = await GroupMember.find({ userId: req.user.id });
    const callerGroupIds = callerMemberships.map((m) => m.groupId.toString());

    // Find groups of target user
    const targetMemberships = await GroupMember.find({ userId: targetUserId });
    const targetGroupIds = targetMemberships.map((m) => m.groupId.toString());

    // Calculate common groups
    const commonGroupIds = targetGroupIds.filter((id) => callerGroupIds.includes(id));

    // If viewing someone with whom you share no groups (and not viewing self)
    const isSelf = req.user.id === targetUserId;
    if (!isSelf && commonGroupIds.length === 0) {
      return res.status(403).json({
        message: 'You can only view profiles and uploads of members within your common groups',
      });
    }

    // Fetch common group details
    const commonGroups = await Group.find({ _id: { $in: commonGroupIds } })
      .select('name description inviteCode')
      .lean();

    // Query files uploaded by target user ONLY in common groups
    const files = await File.find({
      uploadedBy: targetUserId,
      groupId: { $in: commonGroupIds },
    })
      .populate('groupId', 'name inviteCode')
      .sort({ createdAt: -1 })
      .lean();

    const formattedFiles = files.map((f) => {
      const callerGroupMembership = callerMemberships.find(
        (m) => m.groupId.toString() === f.groupId?._id?.toString()
      );
      const isCallerAdmin = callerGroupMembership?.role === 'admin';

      return {
        ...f,
        id: f._id,
        size: formatFileSize(f.fileSize),
        canDelete: isSelf || isCallerAdmin,
      };
    });

    res.json({
      user: {
        ...targetUser,
        id: targetUser._id,
      },
      commonGroups,
      files: formattedFiles,
      isSelf,
    });
  } catch (error) {
    console.error('Fetch user profile error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch user profile' });
  }
});

module.exports = router;
