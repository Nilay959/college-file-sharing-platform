const mongoose = require('mongoose');

const emailDomainSchema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('EmailDomain', emailDomainSchema);
