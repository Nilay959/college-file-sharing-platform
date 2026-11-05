const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { requireAuth, requireAdmin } = require('../middleware/auth');
const { deleteFromR2 } = require('../services/storageService');

const User = require('../models/User');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const File = require('../models/File');
const Activity = require('../models/Activity');

// Protect all admin routes with authentication and website-admin check
router.use(requireAuth, requireAdmin);

// Helper: Format bytes into human-readable string
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper: Categorize file by MIME and extension
function getFileCategory(originalName, mimeType) {
  const ext = (originalName || '').split('.').pop().toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (mime.includes('pdf') || ext === 'pdf') return 'PDF';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'Image';
  if (mime.includes('presentation') || mime.includes('powerpoint') || ['pptx', 'ppt', 'odp'].includes(ext)) return 'Presentation';
  if (mime.includes('spreadsheet') || mime.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext)) return 'Spreadsheet';
  if (mime.includes('word') || ['docx', 'doc', 'txt', 'rtf', 'odt'].includes(ext)) return 'Document';
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'sql', 'sh'].includes(ext)) return 'Code';
  if (mime.includes('zip') || mime.includes('tar') || ['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return 'Archive';
  return 'Other';
}

// ==============================================================
// 1. OVERVIEW & METRICS (DAU, WAU, MAU, Storage, Counts, Trends)
// ==============================================================
router.get('/metrics', async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. User Metrics & DAU / WAU / MAU
    const [
      totalUsers,
      activeUsersCount,
      deactivatedUsersCount,
      verifiedUsersCount,
      adminUsersCount,
      totalGroups,
      totalFiles,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ role: 'admin' }),
      Group.countDocuments(),
      File.countDocuments(),
    ]);

    // DAU: Users who logged in within last 24h OR performed an activity within last 24h
    const [dauLoginUsers, dauActivityUsers] = await Promise.all([
      User.find({ lastLogin: { $gte: oneDayAgo } }).distinct('_id'),
      Activity.find({ createdAt: { $gte: oneDayAgo } }).distinct('userId'),
    ]);
    const dauUserIds = new Set([...dauLoginUsers.map(String), ...dauActivityUsers.map(String)]);
    const dau = dauUserIds.size;

    // WAU: Users active in last 7 days
    const [wauLoginUsers, wauActivityUsers] = await Promise.all([
      User.find({ lastLogin: { $gte: sevenDaysAgo } }).distinct('_id'),
      Activity.find({ createdAt: { $gte: sevenDaysAgo } }).distinct('userId'),
    ]);
    const wau = new Set([...wauLoginUsers.map(String), ...wauActivityUsers.map(String)]).size;

    // MAU: Users active in last 30 days
    const [mauLoginUsers, mauActivityUsers] = await Promise.all([
      User.find({ lastLogin: { $gte: thirtyDaysAgo } }).distinct('_id'),
      Activity.find({ createdAt: { $gte: thirtyDaysAgo } }).distinct('userId'),
    ]);
    const mau = new Set([...mauLoginUsers.map(String), ...mauActivityUsers.map(String)]).size;

    // DAU/MAU Ratio (Stickiness)
    const engagementRatio = mau > 0 ? parseFloat(((dau / mau) * 100).toFixed(1)) : 0;

    // 2. Storage Aggregation
    const storageAgg = await File.aggregate([
      {
        $group: {
          _id: null,
          totalBytes: { $sum: '$fileSize' },
          avgBytes: { $avg: '$fileSize' },
        },
      },
    ]);
    const totalStorageBytes = storageAgg[0]?.totalBytes || 0;
    const avgFileSizeBytes = storageAgg[0]?.avgBytes || 0;

    // 3. Storage Breakdown by Category
    const allFiles = await File.find().select('originalName mimeType fileSize').lean();
    const categoryMap = {};

    allFiles.forEach((file) => {
      const cat = getFileCategory(file.originalName, file.mimeType);
      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, bytes: 0 };
      }
      categoryMap[cat].count += 1;
      categoryMap[cat].bytes += (file.fileSize || 0);
    });

    const storageBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      count: data.count,
      bytes: data.bytes,
      formattedSize: formatBytes(data.bytes),
      percentage: totalStorageBytes > 0 ? parseFloat(((data.bytes / totalStorageBytes) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.bytes - a.bytes);

    // 4. 7-Day Upload & Activity Trend
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const label = startOfDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      past7Days.push({ label, start: startOfDay, end: endOfDay });
    }

    const trendPromises = past7Days.map(async (day) => {
      const [uploads, activities, activeDayUsers] = await Promise.all([
        File.find({ createdAt: { $gte: day.start, $lte: day.end } }).select('fileSize').lean(),
        Activity.countDocuments({ createdAt: { $gte: day.start, $lte: day.end } }),
        Activity.find({ createdAt: { $gte: day.start, $lte: day.end } }).distinct('userId'),
      ]);

      const uploadBytes = uploads.reduce((acc, f) => acc + (f.fileSize || 0), 0);

      return {
        date: day.label,
        uploadsCount: uploads.length,
        uploadBytes,
        formattedUploadBytes: formatBytes(uploadBytes),
        activityCount: activities,
        activeUsers: activeDayUsers.length,
      };
    });

    const activityTrend = await Promise.all(trendPromises);

    // 5. Recent System Activities (Audit Log)
    const recentActivities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('userId', 'name email avatar role')
      .populate('groupId', 'name inviteCode')
      .populate('fileId', 'originalName fileSize')
      .lean();

    res.json({
      overview: {
        totalUsers,
        activeUsersCount,
        deactivatedUsersCount,
        verifiedUsersCount,
        adminUsersCount,
        totalGroups,
        totalFiles,
        totalStorageBytes,
        formattedTotalStorage: formatBytes(totalStorageBytes),
        avgFileSizeBytes: Math.round(avgFileSizeBytes),
        formattedAvgFileSize: formatBytes(avgFileSizeBytes),
      },
      engagement: {
        dau,
        wau,
        mau,
        engagementRatio,
      },
      storageBreakdown,
      activityTrend,
      recentActivities,
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    res.status(500).json({ message: 'Failed to retrieve admin metrics: ' + error.message });
  }
});

// ==============================================================
// 2. USERS MANAGEMENT
// ==============================================================
router.get('/users', async (req, res) => {
  try {
    const { search, status, role } = req.query;

    const query = {};
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ];
    }
    if (status === 'active') query.isActive = true;
    if (status === 'deactivated') query.isActive = false;
    if (role === 'admin') query.role = 'admin';
    if (role === 'user') query.role = 'user';

    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean();

    // Aggregate user details: groups count, files uploaded count, total storage
    const userIds = users.map((u) => u._id);

    const [groupMemberships, fileStats] = await Promise.all([
      GroupMember.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
      File.aggregate([
        { $match: { uploadedBy: { $in: userIds } } },
        {
          $group: {
            _id: '$uploadedBy',
            count: { $sum: 1 },
            totalBytes: { $sum: '$fileSize' },
          },
        },
      ]),
    ]);

    const membershipMap = {};
    groupMemberships.forEach((m) => {
      membershipMap[String(m._id)] = m.count;
    });

    const fileMap = {};
    fileStats.forEach((f) => {
      fileMap[String(f._id)] = {
        count: f.count,
        totalBytes: f.totalBytes,
      };
    });

    const formattedUsers = users.map((u) => {
      const uid = String(u._id);
      const filesCount = fileMap[uid]?.count || 0;
      const storageBytes = fileMap[uid]?.totalBytes || 0;

      return {
        id: u._id,
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.avatar || '',
        isActive: u.isActive !== false,
        isVerified: Boolean(u.isVerified),
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        groupsCount: membershipMap[uid] || 0,
        filesCount,
        storageBytes,
        formattedStorage: formatBytes(storageBytes),
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch users: ' + error.message });
  }
});

// Toggle User Active / Deactivated status
router.put('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const targetUserId = req.params.id;

    if (String(targetUserId) === String(req.user.id)) {
      return res.status(400).json({ message: 'You cannot deactivate your own admin account.' });
    }

    const user = await User.findByIdAndUpdate(
      targetUserId,
      { isActive: Boolean(isActive) },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User account has been ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
      user,
    });
  } catch (error) {
    console.error('Admin user status error:', error);
    res.status(500).json({ message: 'Failed to update user status: ' + error.message });
  }
});

// Update User Role (Promote to Admin / Demote to User)
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const targetUserId = req.params.id;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified. Must be "user" or "admin".' });
    }

    if (String(targetUserId) === String(req.user.id) && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin privileges.' });
    }

    const user = await User.findByIdAndUpdate(
      targetUserId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User role updated to ${role} successfully.`,
      user,
    });
  } catch (error) {
    console.error('Admin user role error:', error);
    res.status(500).json({ message: 'Failed to update user role: ' + error.message });
  }
});

// Delete User permanently (Cascade cleanup)
router.delete('/users/:id', async (req, res) => {
  try {
    const targetUserId = req.params.id;

    if (String(targetUserId) === String(req.user.id)) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 1. Delete all files uploaded by this user
    const userFiles = await File.find({ uploadedBy: targetUserId });
    for (const file of userFiles) {
      if (file.storageKey) {
        try {
          await deleteFromR2(file.storageKey);
        } catch (err) {
          console.warn('R2 deletion warning during user delete:', err.message);
        }
      }
    }
    await File.deleteMany({ uploadedBy: targetUserId });

    // 2. Remove group memberships
    await GroupMember.deleteMany({ userId: targetUserId });

    // 3. For groups owned by user, remove or delete them
    const ownedGroups = await Group.find({ createdBy: targetUserId });
    for (const group of ownedGroups) {
      await File.deleteMany({ groupId: group._id });
      await GroupMember.deleteMany({ groupId: group._id });
      await Group.deleteOne({ _id: group._id });
    }

    // 4. Delete user record
    await User.deleteOne({ _id: targetUserId });

    res.json({
      success: true,
      message: `User "${user.name}" and associated records deleted permanently.`,
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user: ' + error.message });
  }
});

// ==============================================================
// 3. GROUPS MANAGEMENT
// ==============================================================
router.get('/groups', async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { inviteCode: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ];
    }

    const groups = await Group.find(query)
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();

    const groupIds = groups.map((g) => g._id);

    // Aggregate members and storage per group
    const [memberAgg, fileAgg] = await Promise.all([
      GroupMember.aggregate([
        { $match: { groupId: { $in: groupIds } } },
        { $group: { _id: '$groupId', count: { $sum: 1 } } },
      ]),
      File.aggregate([
        { $match: { groupId: { $in: groupIds } } },
        {
          $group: {
            _id: '$groupId',
            count: { $sum: 1 },
            totalBytes: { $sum: '$fileSize' },
          },
        },
      ]),
    ]);

    const memberMap = {};
    memberAgg.forEach((m) => {
      memberMap[String(m._id)] = m.count;
    });

    const fileMap = {};
    fileAgg.forEach((f) => {
      fileMap[String(f._id)] = {
        count: f.count,
        totalBytes: f.totalBytes,
      };
    });

    const formattedGroups = groups.map((g) => {
      const gid = String(g._id);
      const totalBytes = fileMap[gid]?.totalBytes || 0;

      return {
        id: g._id,
        _id: g._id,
        name: g.name,
        description: g.description || '',
        inviteCode: g.inviteCode,
        createdBy: g.createdBy,
        createdAt: g.createdAt,
        memberCount: memberMap[gid] || 0,
        fileCount: fileMap[gid]?.count || 0,
        totalBytes,
        formattedStorage: formatBytes(totalBytes),
      };
    });

    res.json(formattedGroups);
  } catch (error) {
    console.error('Admin groups fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch groups: ' + error.message });
  }
});

// Delete Group permanently
router.delete('/groups/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // 1. Delete all group files from R2 storage and database
    const files = await File.find({ groupId });
    for (const file of files) {
      if (file.storageKey) {
        try {
          await deleteFromR2(file.storageKey);
        } catch (err) {
          console.warn('R2 deletion warning during group delete:', err.message);
        }
      }
    }
    await File.deleteMany({ groupId });

    // 2. Delete memberships and activities
    await GroupMember.deleteMany({ groupId });
    await Activity.deleteMany({ groupId });

    // 3. Delete group record
    await Group.deleteOne({ _id: groupId });

    res.json({
      success: true,
      message: `Group "${group.name}" and all associated files deleted permanently.`,
    });
  } catch (error) {
    console.error('Admin delete group error:', error);
    res.status(500).json({ message: 'Failed to delete group: ' + error.message });
  }
});

// ==============================================================
// 4. FILES MANAGEMENT & MODERATION
// ==============================================================
router.get('/files', async (req, res) => {
  try {
    const { search, type, sort } = req.query;
    const query = {};

    if (search && search.trim()) {
      query.originalName = { $regex: search.trim(), $options: 'i' };
    }

    if (type && type !== 'all') {
      const lower = type.toLowerCase();
      if (lower === 'pdf') {
        query.mimeType = { $regex: 'pdf', $options: 'i' };
      } else if (lower === 'image' || lower === 'img') {
        query.mimeType = { $regex: '^image/', $options: 'i' };
      } else if (lower === 'doc') {
        query.$or = [
          { mimeType: { $regex: 'word|officedocument.wordprocessingml', $options: 'i' } },
          { originalName: { $regex: '\\.(docx?|txt|rtf|odt)$', $options: 'i' } },
        ];
      } else if (lower === 'ppt') {
        query.$or = [
          { mimeType: { $regex: 'presentation|powerpoint|officedocument.presentationml', $options: 'i' } },
          { originalName: { $regex: '\\.(pptx?|odp)$', $options: 'i' } },
        ];
      } else if (lower === 'xls') {
        query.$or = [
          { mimeType: { $regex: 'spreadsheet|excel|officedocument.spreadsheetml', $options: 'i' } },
          { originalName: { $regex: '\\.(xlsx?|csv)$', $options: 'i' } },
        ];
      } else if (lower === 'code') {
        query.originalName = { $regex: '\\.(js|jsx|ts|tsx|py|java|c|cpp|cs|html|css|json|sql|sh)$', $options: 'i' };
      } else if (lower === 'zip') {
        query.$or = [
          { mimeType: { $regex: 'zip|tar|compressed|archive', $options: 'i' } },
          { originalName: { $regex: '\\.(zip|rar|7z|gz|tar)$', $options: 'i' } },
        ];
      }
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'largest') sortOption = { fileSize: -1 };
    if (sort === 'smallest') sortOption = { fileSize: 1 };

    const files = await File.find(query)
      .populate('uploadedBy', 'name email avatar')
      .populate('groupId', 'name inviteCode')
      .sort(sortOption)
      .lean();

    const formattedFiles = files.map((f) => ({
      id: f._id,
      _id: f._id,
      originalName: f.originalName,
      mimeType: f.mimeType,
      fileSize: f.fileSize,
      formattedSize: formatBytes(f.fileSize),
      storageKey: f.storageKey,
      fileUrl: f.fileUrl,
      createdAt: f.createdAt,
      uploadedBy: f.uploadedBy,
      group: f.groupId,
      category: getFileCategory(f.originalName, f.mimeType),
    }));

    res.json(formattedFiles);
  } catch (error) {
    console.error('Admin files fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch files: ' + error.message });
  }
});

// Delete File permanently (Moderation)
router.delete('/files/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.storageKey) {
      try {
        await deleteFromR2(file.storageKey);
      } catch (err) {
        console.warn('R2 deletion warning:', err.message);
      }
    }

    await File.deleteOne({ _id: file._id });

    // Record activity
    await Activity.create({
      userId: req.user.id,
      groupId: file.groupId,
      action: 'deleted_file',
      details: `Admin deleted file "${file.originalName}"`,
    });

    res.json({
      success: true,
      message: `File "${file.originalName}" deleted permanently by administrator.`,
    });
  } catch (error) {
    console.error('Admin delete file error:', error);
    res.status(500).json({ message: 'Failed to delete file: ' + error.message });
  }
});

// ==============================================================
// 5. STORAGE TELEMETRY & ANALYTICS
// ==============================================================
router.get('/storage', async (req, res) => {
  try {
    const [allFiles, totalStorageAgg] = await Promise.all([
      File.find()
        .populate('uploadedBy', 'name email avatar')
        .populate('groupId', 'name inviteCode')
        .lean(),
      File.aggregate([
        {
          $group: {
            _id: null,
            totalBytes: { $sum: '$fileSize' },
            totalFiles: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalBytes = totalStorageAgg[0]?.totalBytes || 0;
    const totalFiles = totalStorageAgg[0]?.totalFiles || 0;

    // Breakdown by category
    const catMap = {};
    const groupStorageMap = {};
    const userStorageMap = {};

    allFiles.forEach((file) => {
      const cat = getFileCategory(file.originalName, file.mimeType);
      if (!catMap[cat]) catMap[cat] = { count: 0, bytes: 0 };
      catMap[cat].count += 1;
      catMap[cat].bytes += (file.fileSize || 0);

      // Group storage
      if (file.groupId) {
        const gid = String(file.groupId._id);
        if (!groupStorageMap[gid]) {
          groupStorageMap[gid] = {
            id: gid,
            name: file.groupId.name,
            inviteCode: file.groupId.inviteCode,
            bytes: 0,
            fileCount: 0,
          };
        }
        groupStorageMap[gid].bytes += (file.fileSize || 0);
        groupStorageMap[gid].fileCount += 1;
      }

      // User storage
      if (file.uploadedBy) {
        const uid = String(file.uploadedBy._id);
        if (!userStorageMap[uid]) {
          userStorageMap[uid] = {
            id: uid,
            name: file.uploadedBy.name,
            email: file.uploadedBy.email,
            avatar: file.uploadedBy.avatar || '',
            bytes: 0,
            fileCount: 0,
          };
        }
        userStorageMap[uid].bytes += (file.fileSize || 0);
        userStorageMap[uid].fileCount += 1;
      }
    });

    const categoryBreakdown = Object.entries(catMap).map(([category, d]) => ({
      category,
      count: d.count,
      bytes: d.bytes,
      formattedSize: formatBytes(d.bytes),
      percentage: totalBytes > 0 ? parseFloat(((d.bytes / totalBytes) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.bytes - a.bytes);

    // Top 5 Largest Files
    const largestFiles = [...allFiles]
      .sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0))
      .slice(0, 5)
      .map((f) => ({
        id: f._id,
        name: f.originalName,
        category: getFileCategory(f.originalName, f.mimeType),
        fileSize: f.fileSize,
        formattedSize: formatBytes(f.fileSize),
        groupName: f.groupId?.name || 'Group',
        uploaderName: f.uploadedBy?.name || 'User',
        createdAt: f.createdAt,
      }));

    // Top 5 Groups by Storage
    const topGroups = Object.values(groupStorageMap)
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5)
      .map((g) => ({
        ...g,
        formattedSize: formatBytes(g.bytes),
        percentage: totalBytes > 0 ? parseFloat(((g.bytes / totalBytes) * 100).toFixed(1)) : 0,
      }));

    // Top 5 Users by Storage
    const topUsers = Object.values(userStorageMap)
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5)
      .map((u) => ({
        ...u,
        formattedSize: formatBytes(u.bytes),
        percentage: totalBytes > 0 ? parseFloat(((u.bytes / totalBytes) * 100).toFixed(1)) : 0,
      }));

    res.json({
      totalBytes,
      formattedTotalStorage: formatBytes(totalBytes),
      totalFiles,
      categoryBreakdown,
      largestFiles,
      topGroups,
      topUsers,
    });
  } catch (error) {
    console.error('Admin storage fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch storage telemetry: ' + error.message });
  }
});

module.exports = router;
