const express = require('express');
const router = express.Router();
const GroupMember = require('../models/GroupMember');
const File = require('../models/File');
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');

// GET /api/dashboard - Overview statistics and recent activity
router.get('/', requireAuth, async (req, res) => {
  try {
    // 1. Groups user belongs to
    const userMemberships = await GroupMember.find({ userId: req.user.id });
    const userGroupIds = userMemberships.map((m) => m.groupId);

    const totalGroups = userGroupIds.length;

    if (totalGroups === 0) {
      return res.json({
        totalGroups: 0,
        totalMembers: 0,
        totalFiles: 0,
        recentActivity: [],
      });
    }

    // 2. Count distinct members across user's groups
    const distinctMembers = await GroupMember.distinct('userId', {
      groupId: { $in: userGroupIds },
    });
    const totalMembers = distinctMembers.length;

    // 3. Count total files across user's groups
    const totalFiles = await File.countDocuments({
      groupId: { $in: userGroupIds },
    });

    // 4. Fetch recent activities within user's groups
    const recentActivity = await Activity.find({
      groupId: { $in: userGroupIds },
    })
      .populate('userId', 'name email avatar')
      .populate('groupId', 'name inviteCode')
      .populate('fileId', 'originalName mimeType fileSize')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    res.json({
      totalGroups,
      totalMembers,
      totalFiles,
      recentActivity,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
