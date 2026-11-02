const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Prevent duplicate membership in the same group
groupMemberSchema.index({ userId: 1, groupId: 1 }, { unique: true });

module.exports = mongoose.model('GroupMember', groupMemberSchema);
