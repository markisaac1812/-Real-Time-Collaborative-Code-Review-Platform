import mongoose from 'mongoose';
import User from '../src/models/userModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './config.env' });

const createAdminUser = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE_URI);
    console.log('Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'AdminPass123!',
      confirmPassword: 'AdminPass123!',
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User',
        bio: 'System Administrator'
      },
      skills: ['administration'],
      reputation: {
        points: 1000,
        level: 'Master'
      }
    });

    console.log('Admin user created successfully:');
    console.log(`Username: ${adminUser.username}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdminUser();
