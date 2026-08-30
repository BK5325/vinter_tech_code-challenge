require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for seeding...');

    const adminEmail = process.env.ADMIN_EMAIL || 'vintertech_admin@org.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Vinter@tech7659';
    const adminName = process.env.ADMIN_NAME || 'Vintertech Administrator';

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      if (existing.role !== 'ADMIN') {
        existing.role = 'ADMIN';
        await existing.save({ validateBeforeSave: false });
        console.log(`ℹ️  Existing user promoted to ADMIN: ${adminEmail}`);
      } else {
        console.log(`ℹ️  Admin already exists: ${adminEmail}`);
      }
    } else {
      await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash: adminPassword, // Pre-save hook hashes with bcrypt
        role: 'ADMIN',
        status: 'ACTIVE',
      });
      console.log(`✅ Default admin created: ${adminEmail}`);
      console.log('   Password: [STORED AS BCRYPT HASH — never plaintext]');
    }

    await mongoose.disconnect();
    console.log('✅ Seeding complete.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
