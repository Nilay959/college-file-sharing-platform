require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Hierarchy = require('./models/Hierarchy');
const User = require('./models/User');
const EmailDomain = require('./models/EmailDomain');

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI environment variable is missing");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Seed Admin
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  if (!adminEmail || !adminPassword) {
    console.error("ADMIN_EMAIL or ADMIN_PASSWORD missing in environment");
    process.exit(1);
  }

  const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase().trim() });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await User.create({
      name: adminName,
      email: adminEmail.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      isActive: true,
    });
    console.log(`Created Admin User: ${adminEmail}`);
  } else {
    console.log(`Admin User already exists: ${adminEmail}`);
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
