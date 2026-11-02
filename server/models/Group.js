const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    immutable: true, // Permanent once created, cannot be changed
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
