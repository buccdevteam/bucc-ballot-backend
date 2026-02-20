

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const connectDB = require('../config/database');

const seedAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // If admin exists, delete it
    const existingAdmin = await Admin.findOne({ email: 'admin@bucc.edu.ng' });
    if (existingAdmin) {
      await Admin.deleteOne({ email: 'admin@bucc.edu.ng' });
      console.log('⚠️  Existing admin deleted, creating new one...');
    }

    // Create admin user
    const admin = await Admin.create({
      email: 'admin@bucc.edu.ng',
      password: 'admin123', 
      name: 'Admin User',
      role: 'admin',
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    console.log('⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
