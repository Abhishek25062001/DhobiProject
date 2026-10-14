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

  // Check if Atlas password placeholder is present
  if (primaryUri.includes('<db_password>')) {
    console.warn('\n⚠️  [Database Notice] MONGO_URI in .env contains "<db_password>".');
    console.warn('👉 Please update /server/.env with your actual MongoDB Atlas password.');

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 [Database] Starting In-Memory MongoDB for local development so your server stays online...\n');
      if (!memoryServer) {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
      }
      const inMemoryUri = memoryServer.getUri();
      const conn = await mongoose.connect(inMemoryUri);
      console.log(`[Database] In-Memory MongoDB connected: ${inMemoryUri}`);
      return conn;
    }
  }

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

    // If in development mode and connection fails, fallback gracefully to in-memory DB so dev server doesn't crash
    if (process.env.NODE_ENV !== 'production') {
      console.warn('🔄 [Database] Falling back to In-Memory MongoDB for local development...\n');
      if (!memoryServer) {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
      }
      const inMemoryUri = memoryServer.getUri();
      const conn = await mongoose.connect(inMemoryUri);
      console.log(`[Database] In-Memory MongoDB connected: ${inMemoryUri}`);
      return conn;
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
