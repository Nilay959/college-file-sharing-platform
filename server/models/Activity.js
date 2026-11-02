const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    default: null,
  },
  action: {
    type: String,
    enum: ['created_group', 'joined_group', 'uploaded_file', 'deleted_file', 'removed_member'],
    required: true,
  },
  details: {
    type: String,
    default: '',
  },
}, { timestamps: true });

activitySchema.index({ groupId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
