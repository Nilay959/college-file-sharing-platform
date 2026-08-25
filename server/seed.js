require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Hierarchy = require('./models/Hierarchy');
const User = require('./models/User');
const EmailDomain = require('./models/EmailDomain');

async function seed() {
  if (!process.env.MONGO_URI) { console.error("MONGO_URI environment variable is missing"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Seed Admin
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME;

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!adminEmail || !adminPassword) { console.error("ADMIN_EMAIL or ADMIN_PASSWORD missing"); process.exit(1); }

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      department: 'admin', semester: 'admin', division: 'admin', batch: 'admin' // Dummy data to satisfy required schema
    });
    console.log(`Created Admin User: ${adminEmail}`);
  } else {
    console.log(`Admin User already exists: ${adminEmail}`);
  }

  // Seed Email Domain
  const defaultDomain = 'nirmauni.ac.in';
  const existDomain = await EmailDomain.findOne({ domain: defaultDomain });
  if (!existDomain) {
    await EmailDomain.create({ domain: defaultDomain, isActive: true });
    console.log(`Created allowed domain: ${defaultDomain}`);
  }
  
  // Seed Hierarchy if empty
  const count = await Hierarchy.countDocuments();
  if (count === 0) {
    const dept = await Hierarchy.create({ type: 'department', name: 'Computer Engineering', value: 'compsci' });
    const sem = await Hierarchy.create({ type: 'semester', name: 'Semester 3', value: 'sem3', parentId: dept._id });
    const div = await Hierarchy.create({ type: 'division', name: 'E Division', value: 'edivision', parentId: sem._id });
    await Hierarchy.create({ type: 'batch', name: 'E1', value: 'e1', parentId: div._id });
    await Hierarchy.create({ type: 'batch', name: 'E2', value: 'e2', parentId: div._id });
    console.log('Seeded initial hierarchy');
  }

  console.log('Seed complete!');
  process.exit();
}
seed();
