const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storageKey: { type: String, required: true },
  spaceId: { type: String, required: true, index: true },
  subjectId: { type: String, required: true, index: true },
  uploaderName: { type: String, required: true },
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  size: { type: String, required: true },
  mimeType: { type: String, required: true },
}, { timestamps: true });

fileSchema.index({ spaceId: 1, subjectId: 1, createdAt: -1 });

module.exports = mongoose.model('File', fileSchema);
