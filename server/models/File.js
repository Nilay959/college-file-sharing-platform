const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storageKey: { type: String, required: true },
  fileUrl: { type: String, default: '' },
  fileSize: { type: Number, required: true }, // size in bytes
  mimeType: { type: String, required: true },
  uploadedBy: {
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
  // Backward compatibility fields
  spaceId: { type: String, default: '' },
  subjectId: { type: String, default: '' },
  size: { type: String, default: '' },
}, { timestamps: true });

fileSchema.index({ groupId: 1, createdAt: -1 });
fileSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('File', fileSchema);
