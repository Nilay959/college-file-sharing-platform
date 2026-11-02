const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const File = require('../models/File');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { deleteFromR2 } = require('../services/storageService');

// Generate unique 8-character uppercase invite code (e.g., CS5X8K2P)
const generateInviteCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous 0/O, 1/I
  let code = '';
  let exists = true;

  while (exists) {
    code = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
    }
    const found = await Group.findOne({ inviteCode: code });
    if (!found) exists = false;
  }
  return code;
};

// 1. Create a new group
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const inviteCode = await generateInviteCode();

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      inviteCode,
      createdBy: req.user.id,
    });

    // Creator is automatically the Admin
    await GroupMember.create({
      userId: req.user.id,
      groupId: group._id,
      role: 'admin',
      joinedAt: new Date(),
    });

    // Record activity
    await Activity.create({
      userId: req.user.id,
      groupId: group._id,
      action: 'created_group',
      details: `Created the group "${group.name}"`,
    });

    res.status(201).json({
      group: {
        _id: group._id,
        id: group._id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        role: 'admin',
        memberCount: 1,
        fileCount: 0,
      },
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: error.message || 'Failed to create group' });
  }
});

// 2. Join a group using invite code
router.post('/join', requireAuth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const normalizedCode = inviteCode.trim().toUpperCase();
    const group = await Group.findOne({ inviteCode: normalizedCode });

    if (!group) {
      return res.status(404).json({ message: 'Invalid invite code. Group not found.' });
    }

    // Check if already a member
    const existingMember = await GroupMember.findOne({
      userId: req.user.id,
      groupId: group._id,
    });

    if (existingMember) {
      return res.status(200).json({
        message: 'You are already a member of this group',
        group: {
          _id: group._id,
          id: group._id,
          name: group.name,
          description: group.description,
          inviteCode: group.inviteCode,
          role: existingMember.role,
        },
      });
    }

    // Add as member
    await GroupMember.create({
      userId: req.user.id,
      groupId: group._id,
      role: 'member',
      joinedAt: new Date(),
    });

    // Record activity
    await Activity.create({
      userId: req.user.id,
      groupId: group._id,
      action: 'joined_group',
      details: `${req.user.name || 'A new member'} joined the group`,
    });

    const memberCount = await GroupMember.countDocuments({ groupId: group._id });
    const fileCount = await File.countDocuments({ groupId: group._id });

    res.status(200).json({
      message: `Successfully joined "${group.name}"`,
      group: {
        _id: group._id,
        id: group._id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        role: 'member',
        memberCount,
        fileCount,
      },
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: error.message || 'Failed to join group' });
  }
});

// 3. List all groups user belongs to
router.get('/', requireAuth, async (req, res) => {
  try {
    const memberships = await GroupMember.find({ userId: req.user.id }).sort({ joinedAt: -1 });
    const groupIds = memberships.map((m) => m.groupId);

    const groups = await Group.find({ _id: { $in: groupIds } }).lean();

    // Map counts and roles
    const groupList = await Promise.all(
      groups.map(async (grp) => {
        const membership = memberships.find((m) => m.groupId.toString() === grp._id.toString());
        const memberCount = await GroupMember.countDocuments({ groupId: grp._id });
        const fileCount = await File.countDocuments({ groupId: grp._id });

        return {
          ...grp,
          id: grp._id,
          role: membership?.role || 'member',
          memberCount,
          fileCount,
        };
      })
    );

    res.json(groupList);
  } catch (error) {
    console.error('Fetch groups error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch groups' });
  }
});

// 4. Get single group details (must be a member)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('createdBy', 'name email avatar').lean();
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const membership = await GroupMember.findOne({
      userId: req.user.id,
      groupId: group._id,
    });

    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const memberCount = await GroupMember.countDocuments({ groupId: group._id });
    const fileCount = await File.countDocuments({ groupId: group._id });

    res.json({
      ...group,
      id: group._id,
      role: membership.role,
      memberCount,
      fileCount,
    });
  } catch (error) {
    console.error('Fetch group error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch group' });
  }
});

// 5. Get members of a group
router.get('/:id/members', requireAuth, async (req, res) => {
  try {
    // Check caller is a member
    const isMember = await GroupMember.findOne({
      userId: req.user.id,
      groupId: req.params.id,
    });

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const members = await GroupMember.find({ groupId: req.params.id })
      .populate('userId', 'name email avatar createdAt')
      .sort({ role: 1, joinedAt: 1 }) // Admins first
      .lean();

    const formatted = members
      .filter((m) => m.userId)
      .map((m) => ({
        _id: m._id,
        memberId: m._id,
        userId: m.userId._id,
        name: m.userId.name,
        email: m.userId.email,
        avatar: m.userId.avatar || '',
        role: m.role,
        joinedAt: m.joinedAt,
      }));

    res.json(formatted);
  } catch (error) {
    console.error('Fetch members error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch members' });
  }
});

// 6. Remove a member (Group Admin can remove any member, or user can leave)
router.delete('/:id/members/:targetUserId', requireAuth, async (req, res) => {
  try {
    const { id: groupId, targetUserId } = req.params;

    // Caller membership
    const callerMembership = await GroupMember.findOne({
      userId: req.user.id,
      groupId,
    });

    if (!callerMembership) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const isSelfLeaving = req.user.id === targetUserId;
    const isCallerAdmin = callerMembership.role === 'admin';

    if (!isSelfLeaving && !isCallerAdmin) {
      return res.status(403).json({ message: 'Only group admin can remove members' });
    }

    // Admin cannot remove themselves if they are the sole admin unless they delete the group
    if (isSelfLeaving && isCallerAdmin) {
      const otherAdmins = await GroupMember.countDocuments({
        groupId,
        role: 'admin',
        userId: { $ne: req.user.id },
      });
      if (otherAdmins === 0) {
        return res.status(400).json({
          message: 'As the sole admin, you cannot leave the group. Delete the group instead or promote another admin.',
        });
      }
    }

    const targetMembership = await GroupMember.findOne({
      userId: targetUserId,
      groupId,
    });

    if (!targetMembership) {
      return res.status(404).json({ message: 'Member not found in group' });
    }

    await GroupMember.deleteOne({ _id: targetMembership._id });

    // Record activity
    const targetUser = await User.findById(targetUserId);
    await Activity.create({
      userId: req.user.id,
      groupId,
      action: 'removed_member',
      details: isSelfLeaving
        ? `${targetUser?.name || 'A member'} left the group`
        : `${targetUser?.name || 'A member'} was removed by admin`,
    });

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: error.message || 'Failed to remove member' });
  }
});

// 7. Update group settings (name/description) - Admin only
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Check caller is admin
    const callerMembership = await GroupMember.findOne({
      userId: req.user.id,
      groupId: group._id,
      role: 'admin',
    });

    if (!callerMembership) {
      return res.status(403).json({ message: 'Only group admin can update group settings' });
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    // inviteCode is immutable!

    await group.save();

    res.json({
      group: {
        _id: group._id,
        id: group._id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
      },
      message: 'Group updated successfully',
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: error.message || 'Failed to update group' });
  }
});

// 8. Delete group - Admin only
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const callerMembership = await GroupMember.findOne({
      userId: req.user.id,
      groupId: group._id,
      role: 'admin',
    });

    if (!callerMembership) {
      return res.status(403).json({ message: 'Only group admin can delete this group' });
    }

    // 1. Delete all R2 files
    const files = await File.find({ groupId: group._id });
    for (const file of files) {
      try {
        if (file.storageKey) await deleteFromR2(file.storageKey);
      } catch (err) {
        console.warn('Error deleting R2 object:', err);
      }
    }

    // 2. Delete database records
    await File.deleteMany({ groupId: group._id });
    await GroupMember.deleteMany({ groupId: group._id });
    await Activity.deleteMany({ groupId: group._id });
    await Group.deleteOne({ _id: group._id });

    res.json({ success: true, message: 'Group and all associated files deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: error.message || 'Failed to delete group' });
  }
});

// 9. Get Group Activity
router.get('/:id/activity', requireAuth, async (req, res) => {
  try {
    const isMember = await GroupMember.findOne({
      userId: req.user.id,
      groupId: req.params.id,
    });

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const activities = await Activity.find({ groupId: req.params.id })
      .populate('userId', 'name email avatar')
      .populate('fileId', 'originalName mimeType fileSize')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json(activities);
  } catch (error) {
    console.error('Fetch group activity error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch activity' });
  }
});

module.exports = router;
