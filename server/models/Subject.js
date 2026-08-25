const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortName: { type: String, required: true },
  code: { type: String, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hierarchy', required: true },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hierarchy', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
