const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'student', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  // Backward compatibility fields if any exist
  rollNo: { type: String, default: '' },
  department: { type: String, default: '' },
  semester: { type: String, default: '' },
  division: { type: String, default: '' },
  batch: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
