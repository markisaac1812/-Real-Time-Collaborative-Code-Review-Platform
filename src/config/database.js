import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // MongoDB connection options for optimization
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      readPreference: 'primary', // Use primary read preference
      retryWrites: true,
    };

    
    const DB = process.env.MONGO_DB_CONNECTION_STRING.replace(
      '<db_password>',
      process.env.MONGO_DB_PASSWORD
    );
    console.log(DB);

    const conn = await mongoose.connect(DB, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create database indexes after connection
    await createDatabaseIndexes();
    
    // Monitor connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Log slow queries in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }

  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Create comprehensive database indexes
const createDatabaseIndexes = async () => {
  try {
    console.log('🔄 Creating database indexes...');

    // User collection indexes
    await mongoose.connection.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { username: 1 }, unique: true },
      { key: { 'reputation.points': -1 } },
      { key: { 'reputation.level': 1 } },
      { key: { isActive: 1, lastLogin: -1 } },
      { key: { followers: 1 } },
      { key: { following: 1 } },
      { key: { skills: 1 } },
      { key: { createdAt: -1 } },
      { 
        key: { 
          username: 'text', 
          'profile.firstName': 'text', 
          'profile.lastName': 'text' 
        },
        name: 'user_text_search'
      }
    ]);

    // CodeSubmission collection indexes
    await mongoose.connection.collection('codesubmissions').createIndexes([
      { key: { author: 1, createdAt: -1 } },
      { key: { language: 1, status: 1 } },
      { key: { status: 1, visibility: 1 } },
      { key: { tags: 1 } },
      { key: { category: 1 } },
      { key: { priority: 1 } },
      { key: { 'analytics.views': -1 } },
      { key: { 'analytics.averageRating': -1 } },
      { key: { createdAt: -1 } },
      { key: { completedAt: -1 } },
      { key: { 'reviewers.user': 1, 'reviewers.status': 1 } },
      { 
        key: { 
          title: 'text', 
          description: 'text', 
          tags: 'text' 
        },
        name: 'submission_text_search'
      }
    ]);

    // Review collection indexes
    await mongoose.connection.collection('reviews').createIndexes([
      { key: { submission: 1, reviewer: 1 }, unique: true },
      { key: { reviewer: 1, createdAt: -1 } },
      { key: { submission: 1, status: 1 } },
      { key: { status: 1, submittedAt: -1 } },
      { key: { rating: -1 } },
      { key: { 'interactions.helpful': 1 } },
      { key: { createdAt: -1 } },
      { key: { submittedAt: -1 } }
    ]);

    // Comment collection indexes
    await mongoose.connection.collection('comments').createIndexes([
      { key: { review: 1, createdAt: 1 } },
      { key: { author: 1, createdAt: -1 } },
      { key: { parentComment: 1 } },
      { key: { createdAt: -1 } },
      { key: { 'reactions.likes': 1 } }
    ]);

    // Notification collection indexes
    await mongoose.connection.collection('notifications').createIndexes([
      { key: { recipient: 1, isRead: 1, createdAt: -1 } },
      { key: { sender: 1, createdAt: -1 } },
      { key: { type: 1 } },
      { key: { createdAt: 1 }, expireAfterSeconds: 2592000 } // 30 days TTL
    ]);

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Failed to create indexes:', error);
  }
};

export default connectDB;