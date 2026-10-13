import mongoose from 'mongoose';

let memoryServer = null;

export const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/indodhobi';

  try {
    // Attempt standard connection with 3000ms server selection timeout
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] Standard MongoDB connection to ${primaryUri} failed (${err.message}).`);
    console.log('[Database] Initializing fallback in-memory MongoDB server to ensure zero-setup execution...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const inMemoryUri = memoryServer.getUri();
      const conn = await mongoose.connect(inMemoryUri);
      console.log(`[Database] In-Memory MongoDB Server running & connected successfully: ${inMemoryUri}`);
      return conn;
    } catch (fallbackErr) {
      console.error('[Database] Failed to initialize in-memory fallback MongoDB:', fallbackErr.message);
      throw fallbackErr;
    }
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};

export default connectDB;
