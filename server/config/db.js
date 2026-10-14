import mongoose from 'mongoose';

let memoryServer = null;

export const connectDB = async () => {
  // Only use mongodb-memory-server when running automated tests (NODE_ENV === 'test')
  if (process.env.NODE_ENV === 'test') {
    if (!memoryServer) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
    }
    const inMemoryUri = memoryServer.getUri();
    const conn = await mongoose.connect(inMemoryUri);
    console.log(`[Database] In-Memory MongoDB connected for testing: ${inMemoryUri}`);
    return conn;
  }

  // Strict connection to real MongoDB in production/development
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/indodhobi';

  try {
    const conn = await mongoose.connect(primaryUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] Production MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    const maskedUri = primaryUri.replace(/:([^@]+)@/, ':***@');
    console.error(`[Database] Strict MongoDB connection to ${maskedUri} failed: ${err.message}`);
    if (primaryUri.includes('<db_password>')) {
      console.warn('[Database] Notice: MONGO_URI in .env contains "<db_password>". Please update with your actual MongoDB Atlas password.');
    }
    throw err;
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

export default connectDB;
