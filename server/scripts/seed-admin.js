/**
 * Seed Script: Initial Administrator Setup
 *
 * Usage:
 *   node server/scripts/seed-admin.js
 *
 * Creates or updates the default initial Administrator account and
 * ensures existing faculty records have facultyId and credentials set.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

async function seed() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('Error: MONGODB_URI not found in environment.');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected.');

    // 1. Check or create initial Admin
    const existingAdmin = await User.findOne({ position: 'Admin' });
    if (existingAdmin) {
      console.log(`Administrator already exists: "${existingAdmin.name}" (Admin ID: ${existingAdmin.adminId || existingAdmin.enrollmentNumber || 'N/A'}, Email: ${existingAdmin.email || 'N/A'})`);
    } else {
      console.log('Creating initial Administrator account...');
      const admin = new User({
        name: 'Chief Librarian',
        adminId: 'ADMIN01',
        email: 'admin@library.edu',
        department: 'Library Administration',
        position: 'Admin',
        role: 'admin',
        password: 'AdminPassword123!', // Secure default, change in production
      });
      await admin.save();
      console.log('Created Initial Administrator:');
      console.log('  Name: Chief Librarian');
      console.log('  Admin ID: ADMIN01');
      console.log('  Email: admin@library.edu');
      console.log('  Default Password: AdminPassword123!');
    }

    // 2. Ensure existing Teacher account has facultyId and password configured
    const existingTeacher = await User.findOne({ position: 'Teacher' });
    if (existingTeacher) {
      let updated = false;
      if (!existingTeacher.facultyId) {
        existingTeacher.facultyId = existingTeacher.enrollmentNumber || 'FAC001';
        updated = true;
      }
      if (!existingTeacher.email) {
        existingTeacher.email = 'teacher@library.edu';
        updated = true;
      }
      if (!existingTeacher.password) {
        existingTeacher.password = 'TeacherPassword123!';
        updated = true;
      }
      if (updated) {
        await existingTeacher.save();
        console.log(`Updated existing teacher "${existingTeacher.name}" with facultyId: ${existingTeacher.facultyId}, email: ${existingTeacher.email}`);
      } else {
        console.log(`Teacher "${existingTeacher.name}" already has facultyId: ${existingTeacher.facultyId}`);
      }
    }

    console.log('\nSeed completed successfully.');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
