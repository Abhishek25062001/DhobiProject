import mongoose from 'mongoose';

let memoryServer = null;

export const connectDB = async () => {
  // ─────────────────────────────────────────────────────────────────────────
  // TEST MODE: isolated in-memory MongoDB — ONLY when NODE_ENV === 'test'
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUCTION / DEVELOPMENT: STRICT real MongoDB — NO silent fallbacks
  // ─────────────────────────────────────────────────────────────────────────
  const primaryUri = process.env.MONGO_URI;

  if (!primaryUri) {
    console.error('\n❌ [Database] MONGO_URI is not set in /server/.env');
    console.error('   Add: MONGO_URI=mongodb+srv://... or MONGO_URI=mongodb://127.0.0.1:27017/indodhobi');
    throw new Error('MONGO_URI is missing. Configure server/.env before starting the API.');
  }

  if (primaryUri.includes('<db_password>')) {
    console.error('\n❌ [Database] MONGO_URI still contains the "<db_password>" placeholder.');
    console.error('   Replace it with your real MongoDB Atlas password in /server/.env');
    throw new Error('MONGO_URI contains an unresolved database password placeholder.');
  }

  try {
    const conn = await mongoose.connect(primaryUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });

    const host = conn.connection.host;
    const dbName = conn.connection.name;

    console.log('\n======================================================');
    console.log(`✅ [REAL DB CONNECTED] Host: ${host} | DB Name: ${dbName}`);
    console.log('======================================================\n');

    return conn;
  } catch (err) {
    const maskedUri = primaryUri.replace(/:([^@]+)@/, ':***@');
    console.error(`\n❌ [Database] Connection to "${maskedUri}" FAILED.`);
    console.error(`   Reason: ${err.message}`);
    console.error('   Fix your MONGO_URI in /server/.env and restart the server.\n');
    throw new Error('MongoDB connection failed. Check MONGO_URI and database access, then restart the API.');
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
