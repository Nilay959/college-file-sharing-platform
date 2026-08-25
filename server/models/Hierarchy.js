const mongoose = require('mongoose');

const hierarchySchema = new mongoose.Schema({
  type: { type: String, enum: ['department', 'semester', 'division', 'batch'], required: true },
  name: { type: String, required: true },
  value: { type: String, required: true, unique: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hierarchy', default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Hierarchy', hierarchySchema);
